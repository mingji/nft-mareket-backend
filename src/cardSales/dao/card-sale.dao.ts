import { Dao } from '../../dao/dao';
import { ICardSaleDocument, ICardSaleLeanDocument, ICurrency } from '../schemas/card-sales.schema';
import { IGetCardsQuery } from '../../cards/dao/card.dao';
import { ICurrenciesExchangeData } from '../../cryptocurrencies/exchange.service';
import { IPaginatedCardSaleIds } from '../types/scheme';
import { Network } from '../../config/types/constants';
import { WyvernExchangeType } from '../../blockchain/types/wyvern-exchange/scheme';

export abstract class CardSaleDao extends Dao {
    public abstract getSalesByCardId(cardId: string): Promise<ICardSaleDocument[]>;

    public abstract getTotalTokenOnSaleByCardIdAndUserId(cardId: string, userId: string): Promise<number>;

    public abstract getCardsIdsBySortingPrice(
        query: IGetCardsQuery,
        userId?: string
    ): Promise<IPaginatedCardSaleIds>;

    public abstract getSaleAllCurrencies(): Promise<ICurrency[]>;

    public abstract updatePriceUsd(
        symbol: string,
        symbolId: number | null,
        quote: ICurrenciesExchangeData
    ): Promise<any>;

    public abstract deleteSalesByCardIds(cardIds: string[]): Promise<void>;

    public abstract deleteSalesByCardIdAndUserId(cardId: string, userId: string): Promise<void>;

    public abstract deleteSaleById(saleId: string): Promise<void>;

    public abstract createSale(
        blockchain: Network,
        cardId: string,
        userId: string,
        tokensCount: number,
        price: string,
        currency: ICurrency,
        priceUsd: number,
        signature: string,
        saleContract: string,
        order: any[],
        orderHash: string,
        publishFrom?: Date,
        publishTo?: Date
    ): Promise<ICardSaleDocument>;

    public abstract changeSalesStatus(blockchain: WyvernExchangeType, orderHashes: string[]): Promise<void>;

    public abstract getSalesByOrderHashes(
        blockchain: WyvernExchangeType,
        orderHashes: string[],
        projection?: string[],
        lean?: boolean
    ): Promise<Array<ICardSaleDocument | ICardSaleLeanDocument>>;

    public abstract existsSalesByCardId(cardId: string): Promise<boolean>;
}
