import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SortOrder } from '../types/constants';
import { ITokenCollectionDocument, ITokenCollectionLeanDocument } from './schemas/token-collection.schema';
import { IGetListQuery, TokenCollectionDao } from './dao/token-collection.dao';
import { IPaginatedList } from '../types/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { SubgraphService } from '../subgraph/subgraph.service';
import { UsersService } from '../users/users.service';
import { CardsService } from '../cards/cards.service';
import { Errors } from '../types/errors';
import { ConfigService } from '@nestjs/config';
import { blockchainConfig, IAllowedCurrency } from '../config';
import { EIP, Network } from '../config/types/constants';
import { JobType } from '../jobs/types/enums';
import { JobsService } from '../jobs/jobs.service';
import { UtilsService } from '../utils/utils.service';
import { IContractMetadataDocument } from '../metadata/schemas/contract-metadata.schema';
import { ContractMetadataService } from '../metadata/services';
import { GetUserCollectionsDto } from './dto/request/get-user-collections.dto';
import { ICollection } from './types/scheme';
import { UpdateTokenCollectionDto } from './dto/request/update-token-collection.dto';
import { IS3File } from '../types/scheme';
import { IUserDocument } from '../users/schemas/user.schema';

@Injectable()
export class TokenCollectionsService extends MongooseService {
    constructor(
        @Inject(forwardRef(() => CardsService))
        private readonly cardsService: CardsService,
        private readonly tokenCollectionDao: TokenCollectionDao,
        private readonly usersService: UsersService,
        private readonly subgraphService: SubgraphService,
        private readonly configService: ConfigService,
        private readonly jobsService: JobsService,
        private readonly utilsService: UtilsService,
        private readonly contractMetadataService: ContractMetadataService,
    ) {
        super();
    }

    protected get dao(): TokenCollectionDao {
        return this.tokenCollectionDao;
    }

    async getUserCreatedCollections(
        userId: string,
        limit: number,
        offset: number,
        sort: SortOrder = SortOrder.desc
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        return this.tokenCollectionDao.getUserCreatedCollections(userId, limit, offset, sort);
    }

    async getUserCollections(
        userId: string,
        query: GetUserCollectionsDto
    ): Promise<IPaginatedList<ICollection>> {
        const { data: res, total, offset, limit } = await this.tokenCollectionDao.getUserCollections(userId, query);
        const ownersData = await this.cardsService.getOwnerCardsCountByCollectionsIds(res.map(c => c._id), userId);

        return {
            data: res.map(collection => ({
                    ...collection,
                    userCardsCount: ownersData
                        .find(item => item.tokenCollectionId === collection._id.toString())
                        ?.userCardsCount ?? 0
                })
            ),
            total,
            offset,
            limit
        };
    }

    async getCollectionsListByFilter(
        query: IGetListQuery,
        lean = false
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        const data = await this.tokenCollectionDao.getCollectionsListByFilter(query, lean);
        const total = await this.tokenCollectionDao.getCollectionsTotalRecordsByFilter(query);

        return { data, total, limit: query.limit, offset: query.offset };
    }

    async getCollectionsByName(
        name: string,
        limit: number,
        lean = false
    ): Promise<ITokenCollectionDocument[]> {
        return this.tokenCollectionDao.getCollectionsListByFilter({ name, limit }, lean);
    }

    async getCollectionsListByIdsAndFilter(
        ids: string[],
        limit,
        offset,
        sort
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        return this.tokenCollectionDao.getCollectionsListByIds(ids, limit, offset, sort);
    }

    async findCollectionByContractId(contractId: string): Promise<ITokenCollectionDocument | null> {
        return this.tokenCollectionDao.findCollectionByContractId(contractId);
    }

    async createCollection(
        network: Network,
        contractId: string,
        userId: string,
        name: string,
        contractUri?: string
    ): Promise<ITokenCollectionDocument | null> {
        let metadata: IContractMetadataDocument;

        if (this.utilsService.isValidURI(contractUri)) {
            try {
                const url = new URL(contractUri);
                if (url.origin !== blockchainConfig().metadataUriDomain) {
                    return null;
                }

                const [, , , , userId, , slug] = url.pathname.split('/');
                if (!userId || !slug) {
                    return null;
                }

                metadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(userId, slug);

                if (!metadata) {
                    return null;
                }
            } catch (e) {
                return null;
            }
        }

        const tokenCollection = await this.dao.createCollection(
            network,
            contractId,
            userId,
            name,
            metadata,
            contractUri
        );

        if (!tokenCollection) {
            return null;
        }

        if (metadata) {
            await this.contractMetadataService.attachTokenCollection(
                metadata.id,
                tokenCollection.id,
                tokenCollection.contractId
            );
        }

        return tokenCollection;
    }

    async findOrCreateCollectionByContractId(
        network: Network,
        contractId: string,
        contractCreatorAddress: string,
        contractName: string
    ): Promise<ITokenCollectionDocument | null> {
        const contractInstance = await this.findCollectionByContractId(contractId);

        if (!contractInstance) {
            const contractCreator = await this.usersService.findOrCreateUserByEthAddress(contractCreatorAddress);
            return await this.createCollection(
                network,
                contractId,
                contractCreator.id,
                contractName
            );
        }

        return contractInstance;
    }

    async syncContract(
        network: Network,
        contractId: string,
        contractCreatorAddress: string,
        contractName: string,
        eipVersion: EIP
    ): Promise<void> {
        const tokens = await this.subgraphService.getTokenWithMetadataListFetch(network, eipVersion, contractId);

        if (!tokens.length) {
            throw new InternalServerErrorException(Errors.EIP_CONTRACT_FETCH_EMPTY_DATA);
        }

        const contractInstance = await this.findOrCreateCollectionByContractId(
            network,
            contractId,
            contractCreatorAddress,
            contractName
        );

        if (!contractInstance) {
            throw new InternalServerErrorException(Errors.UNDEFINED_TOKEN_COLLECTION_INSTANCE);
        }

        await Promise.all(tokens.map(token => this.cardsService.syncCard(contractInstance, token)));

        const unusedCards = await this.cardsService.getUnusedCardsByCollection(
            contractInstance.id,
            tokens.map(token => token.token)
        );

        await this.cardsService.deleteCards(unusedCards);
    }

    async processCreatedContracts(network: Network): Promise<void> {
        const jobType = JobType.createdContractListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(network, jobType);
        if (!processingBlockNumber) {
            return;
        }

        const data = Object.values(await this.subgraphService.getCreatedCollections(network, processingBlockNumber));
        if (!data.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return;
        }

        const creatorAddresses = data.map(contract => contract.creator.id);
        await this.usersService.syncUsers(creatorAddresses);
        const creatorUserIds = await this.usersService.getEntityIdsByFieldData<IUserDocument>(
            'ethAddress',
            creatorAddresses
        );

        await Promise.all(data.map(contract => this.createCollection(
            network,
            contract.collectionAddress,
            creatorUserIds[contract.creator.id],
            contract.name,
            contract.uri
        )));

        await this.jobsService.increaseJobBlockNumber(network, jobType);
    }

    async getContractCryptocurrencyBySymbol(
        tokenCollection: string | ITokenCollectionLeanDocument,
        symbol: string
    ): Promise<IAllowedCurrency | null> {
        if (typeof tokenCollection === 'string') {
            tokenCollection = await this.getById<ITokenCollectionDocument>(tokenCollection, true);
        }

        return tokenCollection.saleContract.allowedCryptocurrencies.find(c => c.symbol === symbol);
    }

    async updateCollectionBySlug(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<void> {
        await this.contractMetadataService.updateMetadata(slug, data, logo);
        await this.dao.updateCollection(slug, data, logo);
    }
}
