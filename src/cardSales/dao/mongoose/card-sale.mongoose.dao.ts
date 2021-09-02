import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoIds, DaoModelNames, SortOrder } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { CardSaleDao } from '../card-sale.dao';
import { ICardSaleDocument, ICardSaleLeanDocument, ICardSaleQuery, ICurrency } from '../../schemas/card-sales.schema';
import { CardSortField, IGetCardsQuery } from '../../../cards/dao/card.dao';
import { ICurrenciesExchangeData } from '../../../cryptocurrencies/exchange.service';
import { SaleStatus } from '../../types/enums';
import { Network, Pagination } from '../../../config/types/constants';
import { IPaginatedCardSaleIds } from '../../types/scheme';
import { ObjectID } from 'mongodb';
import { WyvernExchangeType } from '../../../blockchain/types/wyvern-exchange/scheme';

@Injectable()
export class CardSaleMongooseDao extends DaoMongoose implements CardSaleDao {
    @InjectModel(DaoModelNames.cardSale) private readonly cardSaleModel: Model<ICardSaleDocument>;

    protected get model(): Model<ICardSaleDocument> {
        return this.cardSaleModel;
    }

    async getSalesByCardId(cardId: string): Promise<ICardSaleDocument[]> {
        return this.cardSaleModel
            .find({
                cardId,
                status: { $ne: SaleStatus.sold }
            })
            .populate('userId')
            .sort({ priceUsd: 1 });
    }

    async getTotalTokenOnSaleByCardIdAndUserId(cardId: string, userId: string): Promise<number> {
        const res = await this.cardSaleModel.aggregate([
            {
                $match: {
                    cardId: new ObjectID(cardId),
                    userId: new ObjectID(userId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTokens: { $sum: '$tokensCount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalTokens: 1
                }
            }
        ]);

        return res.length ? res[0].totalTokens : 0;
    }

    async getCardsIdsBySortingPrice(
        {
            sortOrder = SortOrder.asc,
            sortField: querySortField = CardSortField.id,
            collections,
            property,
            categories,
            createdBy,
            search,
            offset = 0,
            limit = Pagination.ITEMS_PER_PAGE
        }: IGetCardsQuery,
        userId?: string
    ): Promise<IPaginatedCardSaleIds> {
        const sortField = querySortField === CardSortField.price ? 'minPrice' : `cards.${querySortField}`;
        const matchQuery = {
            status: { $ne: SaleStatus.sold },
            ...( userId ? { userId: new ObjectID(userId) } : null)
        };

        const cardsQuery = {
            ...(
                collections
                    ? { tokenCollectionId: { $in: collections.map(c => new ObjectID(c)) } }
                    : null
            ),
            ...(
                categories
                    ? { categoryId: { $in: categories.map(c => new ObjectID(c)) } }
                    : null
            ),
            ...( property?.property && property?.value ? { 'properties': { $elemMatch: { ...property } } } : null ),
            ...( createdBy ? { creator: new ObjectID(createdBy) } : null),
            ...( search ? { name: { $regex: `^.*(${search}).*$`, $options: 'i' } } : null),
        };

        const query = [
            {
                $match: matchQuery
            },
            {
                $group: {
                    _id: '$cardId',
                    minPrice: { $min: '$priceUsd' }
                }
            },
            {
                $lookup: {
                    from: DaoIds.cards,
                    let: { letCardId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$letCardId', '$_id'] },
                                ...cardsQuery
                            }
                        }
                    ],
                    as: 'cards'
                }
            },
            {
                $match: {
                    "cards": { $ne: [] }
                }
            },
            {
                $sort: {
                    [sortField]: sortOrder === SortOrder.asc ? 1 : -1
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    ids: { $push: { $toString: '$$ROOT._id' } }
                }
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    ids: {
                        $slice: ['$ids', offset, limit]
                    }
                }
            }
        ];

        const [result] = await this.model.aggregate(query);

        return result ?? { total: 0, ids: [] };
    }

    async getSaleAllCurrencies(): Promise<ICurrency[]> {
        const query = [
            {
                $group: {
                    _id: {
                        symbol: '$currency.symbol',
                        symbolId: '$currency.symbolId',
                    }
                }
            },
            {
                $project: { _id: 1 }
            }
        ];
        const data = await this.cardSaleModel.aggregate(query);

        return data.map(symbol => symbol._id);
    }

    async updatePriceUsd(
        symbol: string,
        symbolId: number | null,
        quote: ICurrenciesExchangeData
    ): Promise<any> {
        return this.cardSaleModel.updateMany(
            { 'currency.symbol': symbol, 'currency.symbolId': symbolId },
            [{
                $set: {
                    priceUsd: {
                        $multiply: ['$price', quote.quote]
                    }
                }
            }]
        );
    }

    async deleteSalesByCardIds(cardIds: string[]): Promise<void> {
        await this.cardSaleModel.deleteMany({ cardId: { $in: cardIds } });
    }

    async deleteSalesByCardIdAndUserId(cardId: string, userId: string): Promise<void> {
        await this.cardSaleModel.deleteMany({ cardId, userId });
    }

    async deleteSaleById(saleId: string): Promise<void> {
        await this.cardSaleModel.deleteOne({ _id: saleId });
    };

    async createSale(
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
    ): Promise<ICardSaleDocument> {
        const [
            addrs,
            uints,
            feeMethod,
            side,
            saleKind,
            howToCall,
            calldata,
            replacementPattern,
            staticExtradata
        ] = order;

        return this.cardSaleModel.create({
            blockchain,
            cardId,
            userId,
            tokensCount,
            price,
            currency,
            priceUsd,
            publishFrom,
            publishTo,
            saleContract,
            order,
            orderParsed: {
                addrs,
                uints,
                feeMethod,
                side,
                saleKind,
                howToCall,
                calldata,
                replacementPattern,
                staticExtradata
            },
            orderHash,
            signature
        });
    }

    async changeSalesStatus(blockchain: WyvernExchangeType, orderHashes: string[]): Promise<void> {
        await this.cardSaleModel.updateMany(
            { blockchain, orderHash: { $in: orderHashes } },
            { status: SaleStatus.sold }
        );
    }

    async getSalesByOrderHashes(
        blockchain: WyvernExchangeType,
        orderHashes: string[],
        projection?: string[],
        lean = false
    ): Promise<Array<ICardSaleDocument | ICardSaleLeanDocument>> {
        const query = this.cardSaleModel
            .find({ blockchain, orderHash: { $in: orderHashes } })
            .select(projection) as ICardSaleQuery<ICardSaleDocument[]>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }

    async existsSalesByCardId(cardId: string): Promise<boolean> {
        return this.model.exists({ cardId, status: SaleStatus.sale });
    }
}
