import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IBalanceCard, ICardDocument, ICardLeanDocument } from './schemas/cards.schema';
import { CardDao, CardSortField, IGetCardsQuery } from './dao/card.dao';
import { IPaginatedList } from '../types/common';
import { IUserDocument } from '../users/schemas/user.schema';
import { CardSalesService } from '../cardSales/card-sales.service';
import { ICardListings, IS3File } from '../types/scheme';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { ITokenCollectionDocument } from '../tokenCollections/schemas/token-collection.schema';
import { StorageService } from '../utils/storage.service';
import { UsersService } from '../users/users.service';
import { MetadataService } from '../subgraph/metadata.service';
import { UtilsService } from '../utils/utils.service';
import { FilesService } from '../files/files.service';
import { IEipMetadata, IEipToken, ISubgraphParsedToken } from '../subgraph/types/eip';
import { SubgraphService } from '../subgraph/subgraph.service';
import { CardViewersService } from '../cardViewers/card-viewers.service';
import { blockchainConfig } from '../config';
import { JobType } from '../jobs/types/enums';
import { JobsService } from '../jobs/jobs.service';
import { TokenMetadataService } from '../metadata/services';
import { ITokenMetadataAttribute } from '../metadata/schemas/token-metadata.schema';
import { EIP, Network } from '../config/types/constants';
import { IOwnerCardsInCollection } from './types/scheme';
import { SaleStatus } from '../cardSales/types/enums';
import { TokenCollectionsService } from '../tokenCollections/token-collections.service';
import { PopulateOptions } from 'mongoose';
import { Reaction } from '../types/constants';

@Injectable()
export class CardsService extends MongooseService {
    constructor(
        @Inject(forwardRef(() => TokenCollectionsService))
        private readonly tokenCollectionsService: TokenCollectionsService,
        @Inject(forwardRef(() => CardSalesService))
        private readonly cardSalesService: CardSalesService,
        private readonly cardDao: CardDao,
        private readonly storageService: StorageService,
        private readonly metadataService: MetadataService,
        private readonly usersService: UsersService,
        private readonly utilsService: UtilsService,
        private readonly filesService: FilesService,
        private readonly subgraphService: SubgraphService,
        private readonly cardViewersService: CardViewersService,
        private readonly jobsService: JobsService,
        private readonly tokenMetadataService: TokenMetadataService
    ) {
        super();
    }

    protected get dao(): CardDao {
        return this.cardDao;
    }

    async findBalanceByUserId(
        card: ICardDocument | string,
        userId: string,
        loadBalanceUser = true
    ): Promise<Partial<IBalanceCard> | null> {
        if (typeof card === 'string') {
            card = await this.getById<ICardDocument>(card) as ICardDocument;
        }

        if (!card) {
            return null;
        }

        const saleTotalTokens = await this.cardSalesService.getTotalTokenOnSaleByCardIdAndUserId(card.id, userId);

        if (loadBalanceUser) {
            await this.loadRelations(card, ['balances.userId']);
        }

        const balance = card.balances.find(balance => {
            const user = balance.user as IUserDocument;
            return (user?._id ?? balance.userId).toString() === userId
        });

        if (!balance) {
            return null;
        }

        return {
            tokenAmount: balance.tokenAmount - saleTotalTokens,
            user: balance.user
        };
    }

    async getCardsList(
        query: IGetCardsQuery,
        userId: string,
        lean = false
    ): Promise<IPaginatedList<ICardDocument>> {
        const { offset, limit, sortField, sale } = query;
        const populate = [
            'creator',
            'tokenCollectionId',
            {
                path: 'sales',
                match: { status: { $ne: SaleStatus.sold } }
            }
        ];
        let data, total;

        if (sortField === CardSortField.price || (sale && userId)) {
            // in this place bug, it does not sort all data,
            // it returns only card ids with sales and has skipping cards without.
            // @TODO: need fix it soon
            const resSales = await this.cardSalesService.getCardsIdsBySortingPrice(query, userId);
            const cardIds = resSales.ids;

            data = await this.cardDao.getCards({}, lean, cardIds, null, populate);
            total = resSales.total;

            data.sort((a, b) =>
                cardIds.indexOf(a._id.toString()) > cardIds.indexOf(b._id.toString()) ? 1 : -1);
        } else {
            data = await this.cardDao.getCards(query, lean, null, userId, populate);
            total = await this.cardDao.getCardsCount(query, null, userId);
        }

        return { data, total, offset, limit };
    }

    async getCardsByName(
        search: string,
        limit: number,
        lean = false
    ): Promise<ICardDocument[]> {
        return this.dao.getCards({ search, limit }, lean, null, null, null);
    }

    async getListingsByCard(card: ICardDocument | string): Promise<ICardListings | null> {
        if (typeof card === 'string') {
            card = await this.getById<ICardDocument>(card) as ICardDocument;
        }

        if (!card) {
            return null;
        }

        const cardSales = await this.cardSalesService.getSalesByCardId(card.id);
        await this.loadRelations(card, ['balances.userId']);

        if (!cardSales.length) {
            return { cardSales, cardBalances: card.balances };
        }

        const cardBalances = [];
        card.balances.forEach(balance => {
            const balanceUser = balance.user as IUserDocument;
            const saleTokenCount = cardSales
                .filter(sale => sale.userIdAsString === balanceUser.id)
                .reduce((a, b) => a + b.tokensCount, 0);

            const balanceTokenAmount = balance.tokenAmount - saleTokenCount;
            if (balanceTokenAmount > 0) {
                cardBalances.push({
                    user: balanceUser,
                    tokenAmount: balanceTokenAmount,
                });
            }
        });

        return { cardSales, cardBalances };
    }

    async syncCard(
        tokenCollection: ITokenCollectionDocument,
        token: IEipToken,
        defaultMetadata: IEipMetadata = null
    ): Promise<void> {
        let animation: IS3File;
        let image: IS3File;

        const tokenId = token.token;
        const {
            animation_url,
            image: image_url,
            attributes,
            name,
            description
        } = token.metadata || defaultMetadata || {};

        if (this.utilsService.isValidURI(animation_url)) {
            animation = await this.filesService.storeFileFromUrl(animation_url, `tokens/animations/${tokenId}`);
        }

        if (this.utilsService.isValidURI(image_url)) {
            image = await this.filesService.storeFileFromUrl(image_url, `tokens/images/${tokenId}`);
        }

        const balances = await this.getBalancesFromToken(token);

        await this.cardDao.syncCard(tokenId, {
            tokenId,
            eipVersion: token.eipVersion,
            identifier: parseInt(token.identifier),
            uri: token.URI,
            totalSupply: parseInt(token.totalSupply),
            creator: tokenCollection.userId,
            balances,
            tokenCollectionId: tokenCollection.id,
            name: name ?? null,
            description,
            properties: attributes ? attributes.map(item => ({ property: item.trait_type, value: item.value })) : null,
            file: {
                original: animation ?? image ?? null,
                preview: animation ? image : null
            }
        });
    }

    async getBalancesFromToken(token: IEipToken): Promise<IBalanceCard[]> {
        const balances = await this.subgraphService.getAllBalancesByToken(token);

        const ethAddresses = balances.map(balance => balance.account.id);

        await this.usersService.syncUsers(ethAddresses);
        const balanceUsers = await this.usersService.getEntityIdsByFieldData<IUserDocument>(
            'ethAddress',
            ethAddresses
        );

        return balances.map(balance => {
            const ethAddress = balance.account.id.toLowerCase();
            const userId = balanceUsers[ethAddress];
            return {
                balanceId: balance.id,
                tokenAmount: parseInt(balance.value),
                userId,
                ethAddress,
            };
        });
    }

    async getUnusedCardsByCollection(
        tokenCollectionId: string,
        excludeTokenIds: string[]
    ): Promise<ICardLeanDocument[]> {
        return this.cardDao.getUnusedCardsByCollection(tokenCollectionId, excludeTokenIds);
    }

    async deleteCards(cards: ICardLeanDocument[]): Promise<void> {
        const cardIds = [];
        const files = [];

        cards.forEach(card => {
            const { id, file: { original, preview } } = card;
            cardIds.push(id);
            files.push(original);
            if (preview) {
                files.push(preview);
            }
        });

        if (cardIds.length) {
            await this.cardDao.deleteCardsByIds(cardIds);
            await this.cardSalesService.deleteSalesByCardIds(cardIds);
        }

        if (files.length) {
            await this.storageService.removeMany(files);
        }
    }

    async getCardsByIds(ids: string[]): Promise<ICardDocument[]> {
        return this.cardDao.getCardsByIds(ids);
    }

    async getCardsByIdAndQuery(
        ids: string[],
        query: IGetCardsQuery,
        lean = false,
        relations?: Array<string | PopulateOptions>
    ): Promise<IPaginatedList<ICardDocument>> {
        const { offset, limit } = query;
        const data = await this.cardDao.getCards(query, lean, ids, null, relations);
        const total = await this.cardDao.getCardsCount(query, ids);
        return { data, total, limit, offset };
    }

    async changeOwnerships(
        card: string | ICardDocument,
        tokensCount: number,
        makerId: string,
        takerId: string,
        takerEthAddress: string
    ): Promise<void> {
        await this.dao.changeOwnerships(card, tokensCount, makerId, takerId, takerEthAddress);
    }

    async processViewersCount(cardId: string, userId: string): Promise<void> {
        if (await this.cardViewersService.existViewer(cardId, userId)) {
            return;
        }

        await this.cardViewersService.storeViewer(cardId, userId);
        await this.dao.increaseViewersCount(cardId);
    }

    async processHasSale(cardId: string): Promise<void> {
        const hasSale = await this.cardSalesService.existsSalesByCardId(cardId);
        await this.dao.updateCardHasSale(cardId, hasSale);
    }

    async processCreatedTokens(network: Network): Promise<void> {
        const jobType = JobType.createdTokenListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(network, jobType);
        if (!processingBlockNumber) {
            return;
        }

        const data = await this.subgraphService.getCreatedTokens(network, processingBlockNumber);
        const contractAddresses = Object.keys(data);

        if (!contractAddresses.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return;
        }

        await Promise.all(
            contractAddresses.map(contractAddress => this.createTokensByContract(
                contractAddress,
                data[contractAddress]
            ))
        );

        await this.jobsService.increaseJobBlockNumber(network, jobType);
    }

    async createTokensByContract(
        contractAddress: string,
        tokens: ISubgraphParsedToken[],
        eipVersion: EIP = EIP.EIP_1155
    ): Promise<void> {
        tokens = tokens.filter(token => new URL(token.uri).origin === blockchainConfig().metadataUriDomain);

        const tokensMetadata = await this.tokenMetadataService.getMetadataByContractAddressAndTokenIdentifiers(
            contractAddress,
            tokens.map(({ identifier }: ISubgraphParsedToken) => identifier)
        );
        if (!tokensMetadata.length) {
            return;
        }

        const cards: ICardLeanDocument[] = tokensMetadata.map(metadata => {
            const subgraphToken = tokens.find(token => token.identifier === metadata.token_identifier);
            const { image, animation } = metadata;
            const tokenId = `${contractAddress}-0x${metadata.token_identifier}`;
            const userEthAddress = subgraphToken.creator.id;
            return {
                tokenId,
                eipVersion,
                identifier: metadata.token_identifier,
                uri: subgraphToken.uri,
                totalSupply: subgraphToken.value,
                creator: metadata.userId,
                balances: [{
                    balanceId: `${tokenId}-${userEthAddress}`,
                    tokenAmount: subgraphToken.value,
                    userId: metadata.userId,
                    ethAddress: userEthAddress,
                }],
                hasSale: false,
                tokenCollectionId: metadata.tokenCollectionId,
                name: metadata.name,
                file: {
                    original: animation ?? image ?? null,
                    preview: animation ? image : null
                },
                description: metadata.description,
                properties: metadata.attributes.map(
                    ({ trait_type: property, value }: ITokenMetadataAttribute) => ({ property, value })
                )
            };
        });

        return this.dao.createCards(cards);
    }

    async getCardsByIdsAndCollectionIds(
        ids: string[],
        collectionIds: string[],
        projection?: string[]
    ): Promise<ICardLeanDocument[]> {
        return this.dao.getCardsByIdsAndCollectionIds(ids, collectionIds, projection);
    }

    async getOwnerCardsCountByCollectionsIds(
        tokenCollectionIds: string[],
        userId: string
    ): Promise<IOwnerCardsInCollection[]> {
        return this.dao.getOwnerCardsCountByCollectionsIds(tokenCollectionIds, userId);
    }

    async processBurnedTokens(network: Network): Promise<void> {
        const jobType = JobType.burnedTokenListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(network, jobType);
        if (!processingBlockNumber) {
            return;
        }

        const data = await this.subgraphService.getBurnedTokens(network, processingBlockNumber);
        const contractAddresses = Object.keys(data);

        if (!contractAddresses.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return;
        }

        const burnedTokens = Object.values(data).flat(1);
        const ethAddresses = burnedTokens.map(token => token.user.id);

        const balanceUserIds = await this.usersService.getEntityIdsByFieldData<IUserDocument>(
            'ethAddress',
            ethAddresses
        );
        const tokenCollectionIds = await this.tokenCollectionsService
            .getEntityIdsByFieldData<ITokenCollectionDocument>(
                'contractId',
                contractAddresses
            );

        for (const token of burnedTokens) {
            await this.burnToken(
                tokenCollectionIds[token.contract],
                token.identifier,
                balanceUserIds[token.user.id],
                token.value
            );
        }

        await this.jobsService.increaseJobBlockNumber(network, jobType);
    }

    async burnToken(
        tokenCollectionId: string,
        identifier: number,
        ownerId: string,
        amount: number
    ): Promise<void> {
        const cardId = await this.dao.burnCard(tokenCollectionId, identifier, ownerId, amount);

        if (!cardId) {
            return ;
        }

        await this.processSaleByChangeOwnership(cardId, ownerId);
    }

    async processSaleByChangeOwnership(
        cardId: string,
        ownerId: string
    ): Promise<void> {
        const ownerSaleAmount = await this.cardSalesService.getTotalTokenOnSaleByCardIdAndUserId(cardId, ownerId);
        if (!ownerSaleAmount) {
            return ;
        }

        const card = await this.dao.findById<ICardDocument>(cardId, true);
        if (!card) {
            return this.cardSalesService.deleteSalesByCardIds([cardId]);
        }

        const ownerBalance = card.balances.find(balance => balance.userId.toString() === ownerId);
        if (ownerSaleAmount > (ownerBalance?.tokenAmount ?? 0)) {
            await this.cardSalesService.deleteSalesByCardIdAndUserId(cardId, ownerId);
        }

        await this.processHasSale(card.id);
    }

    async processTransferTokens(network: Network): Promise<void> {
        const jobType = JobType.transferTokenListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(network, jobType);
        if (!processingBlockNumber) {
            return;
        }

        const data = await this.subgraphService.getTransferTokens(network, processingBlockNumber);
        const contractAddresses = Object.keys(data);

        if (!contractAddresses.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return;
        }

        const tokenCollectionIds = await this.tokenCollectionsService
            .getEntityIdsByFieldData<ITokenCollectionDocument>(
                'contractId',
                contractAddresses
            );
        if (!Object.values(tokenCollectionIds).length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return ;
        }

        const transferTokens = Object.values(data).flat(1);
        const ethAddresses = [...new Set(transferTokens.map(token => ([token.from.id, token.to.id])).flat(1))];

        await this.usersService.syncUsers(ethAddresses);
        const userIds = await this.usersService.getEntityIdsByFieldData<IUserDocument>(
            'ethAddress',
            ethAddresses
        );

        for (const token of transferTokens) {
            const {
                contract,
                identifier,
                value: tokensCount,
                from: { id: makerEthAddress },
                to: { id: takerEthAddress }
            } = token;
            const tokenCollectionId = tokenCollectionIds[contract];

            if (tokenCollectionId) {
                await this.transferToken(
                    tokenCollectionId,
                    identifier,
                    tokensCount,
                    userIds[makerEthAddress],
                    userIds[takerEthAddress],
                    takerEthAddress
                );
            }
        }

        await this.jobsService.increaseJobBlockNumber(network, jobType);
    }

    async transferToken(
        tokenCollectionId: string,
        tokenIdentifier: number,
        tokensCount: number,
        makerId: string,
        takerId: string,
        takerEthAddress: string
    ): Promise<void> {
        const card = await this.dao.findCardByTokenCollectionIdAndIdentifier(tokenCollectionId, tokenIdentifier);
        await this.changeOwnerships(
            card,
            tokensCount,
            makerId,
            takerId,
            takerEthAddress
        );

        await this.processSaleByChangeOwnership(card.id, makerId);
    }

    async likeCard(userId: string, cardId: string): Promise<void> {
        await this.cardDao.toggleLikeOrDislike(userId, cardId, Reaction.likes);
    }

    async dislikeCard(userId: string, cardId: string): Promise<void> {
        await this.cardDao.toggleLikeOrDislike(userId, cardId, Reaction.dislikes);
    }
}
