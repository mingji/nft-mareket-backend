import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CardSaleDao } from './dao/card-sale.dao';
import { ICardSaleDocument, ICardSaleLeanDocument, ICurrency } from './schemas/card-sales.schema';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { IGetCardsQuery } from '../cards/dao/card.dao';
import { ExchangeService, ICurrenciesExchangeData } from '../cryptocurrencies/exchange.service';
import { Errors } from '../types/errors';
import { Errors as SaleErrors } from './types/errors';
import { CryptocurrenciesService } from '../cryptocurrencies/cryptocurrencies.service';
import { ConfigService } from '@nestjs/config';
import * as signature from '../signTypeData/messages/create-sale-signature.json';
import { SignCreateSaleDto } from '../signTypeData/dto/sign-create-sale.dto';
import { JobType } from '../jobs/types/enums';
import { JobsService } from '../jobs/jobs.service';
import { SubgraphService } from '../subgraph/subgraph.service';
import { UsersService } from '../users/users.service';
import { CardsService } from '../cards/cards.service';
import { CryptocurrencyError } from '../cryptocurrencies/errors/cryptocurrency.error';
import { CardSaleError } from './errors/card-sale.error';
import { IPaginatedCardSaleIds } from './types/scheme';
import { Network } from '../config/types/constants';
import { WyvernExchangeType } from '../blockchain/types/wyvern-exchange/scheme';
import { IUserDocument } from '../users/schemas/user.schema';

@Injectable()
export class CardSalesService extends MongooseService {
    constructor(
        private readonly cardSaleDao: CardSaleDao,
        private readonly exchangeService: ExchangeService,
        private readonly cryptocurrenciesService: CryptocurrenciesService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => CardsService)) private readonly cardsService: CardsService,
        private readonly jobsService: JobsService,
        private readonly subgraphService: SubgraphService,
        private readonly usersService: UsersService
    ) {
        super();
    }

    protected get dao(): CardSaleDao {
        return this.cardSaleDao;
    }

    getSaleSignature(): Partial<SignCreateSaleDto> {
        return JSON.parse(JSON.stringify(signature));
    }

    async getSalesByCardId(cardId: string): Promise<ICardSaleDocument[]> {
        return this.cardSaleDao.getSalesByCardId(cardId);
    }

    async getTotalTokenOnSaleByCardIdAndUserId(cardId: string, userId: string): Promise<number> {
        return this.cardSaleDao.getTotalTokenOnSaleByCardIdAndUserId(cardId, userId);
    }

    async getCardsIdsBySortingPrice(
        query: IGetCardsQuery,
        userId?: string
    ): Promise<IPaginatedCardSaleIds> {
        return this.cardSaleDao.getCardsIdsBySortingPrice(query, userId);
    }

    async getSaleAllCurrencies(): Promise<ICurrency[]> {
        return this.cardSaleDao.getSaleAllCurrencies();
    }

    async updatePriceUsd(
        symbol: string,
        symbolId: number | null,
        quote: ICurrenciesExchangeData
    ): Promise<any> {
        return this.cardSaleDao.updatePriceUsd(symbol, symbolId, quote);
    }

    async updateAllSalePriceUsd(): Promise<void> {
        const cryptocurrencies = await this.getSaleAllCurrencies();
        const res = await this.exchangeService.getRate(cryptocurrencies);

        if (!res.length) {
            return;
        }

        for (const currency of cryptocurrencies) {
            const { symbolId, symbol } = currency;
            const quote = res.find(exchange => symbolId ? exchange.symbolId === symbolId : exchange.symbol === symbol);
            if (quote) {
                await this.updatePriceUsd(symbol, symbolId, quote);
            }
        }
    }

    async deleteSalesByCardIds(cardIds: string[]): Promise<void> {
        await this.cardSaleDao.deleteSalesByCardIds(cardIds);
    }

    async deleteSalesByCardIdAndUserId(cardId: string, userId: string): Promise<void> {
        await this.cardSaleDao.deleteSalesByCardIdAndUserId(cardId, userId);
    }

    async deleteSaleById(saleId: string): Promise<void> {
        await this.cardSaleDao.deleteSaleById(saleId);
    }

    async createSale(
        blockchain: Network,
        cardId: string,
        userId: string,
        tokensCount: number,
        price: string,
        currency: string,
        signature: string,
        order: any[],
        orderHash: string,
        saleContract: string,
        publishFrom?: Date,
        publishTo?: Date
    ): Promise<ICardSaleDocument> {
        const rate = await this.exchangeService.getRate([{ symbol: currency }]);
        if (!rate.length) {
            throw new CryptocurrencyError(Errors.WRONG_CURRENCY);
        }

        const { symbolId, symbol, quote } = rate[0];
        const priceUsd = parseFloat(price) * quote;

        const sale = await this.dao.createSale(
            blockchain,
            cardId,
            userId,
            tokensCount,
            price,
            { symbolId, symbol },
            priceUsd,
            signature,
            saleContract,
            order,
            orderHash,
            publishFrom,
            publishTo
        );

        if (!sale) {
            throw new CardSaleError(SaleErrors.SALE_DOES_NOT_CREATED);
        }

        await this.cardsService.processHasSale(cardId);

        return sale;
    }

    async existsSalesByCardId(cardId: string): Promise<boolean> {
        return this.dao.existsSalesByCardId(cardId);
    }

    async changeSalesStatus(network: WyvernExchangeType, orderHashes: string[]): Promise<void> {
        await this.dao.changeSalesStatus(network, orderHashes);
    }

    async getSalesByOrderHashes(
        network: WyvernExchangeType,
        orderHashes: string[],
        projection?: string[],
        lean = false
    ): Promise<Array<ICardSaleDocument | ICardSaleLeanDocument>> {
        return this.dao.getSalesByOrderHashes(network, orderHashes, projection, lean);
    }

    async processSell(network: Network, saleContract: string): Promise<void> {
        const jobType = JobType.saleListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(
            network,
            jobType,
            saleContract
        );
        if (!processingBlockNumber) {
            return;
        }

        const sellData = await this.subgraphService.getAllSellData(network, saleContract, processingBlockNumber);
        const sellOrderHashes = Object.keys(sellData);
        if (!sellOrderHashes.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType, saleContract);
            return;
        }

        const saleInstances = await this.getSalesByOrderHashes(
            network,
            sellOrderHashes,
            ['tokensCount', 'cardId', 'orderHash', 'userId'],
            true
        );
        if (!saleInstances.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType, saleContract);
            return;
        }

        const takerEthAddresses = saleInstances.map(sale => sellData[sale.orderHash].taker.id);
        await this.usersService.syncUsers(takerEthAddresses);
        const takerUserIds = await this.usersService
            .getEntityIdsByFieldData<IUserDocument>('ethAddress', takerEthAddresses);

        await this.changeSalesStatus(network, sellOrderHashes);

        await Promise.all(saleInstances.map(({ cardId, userId, orderHash, tokensCount }: ICardSaleDocument) => {
            const takerEthAddress = sellData[orderHash].taker.id.toLowerCase();
            const takerId = takerUserIds[takerEthAddress];
            return this.cardsService.changeOwnerships(
                cardId.toString(),
                tokensCount,
                userId.toString(),
                takerId,
                takerEthAddress
            );
        }));

        await Promise.all(
            [
                ...new Set(saleInstances.map(sale => sale.cardId))
            ].map(cardId => this.cardsService.processHasSale(cardId.toString()))
        );

        await this.jobsService.increaseJobBlockNumber(network, jobType, saleContract);
    }
}
