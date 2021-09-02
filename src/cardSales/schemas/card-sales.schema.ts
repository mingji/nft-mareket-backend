import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { ICardDocument } from '../../cards/schemas/cards.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { FeeMethod, HowToCall, SaleKind, Side } from '../../blockchain/types/wyvern-exchange/enums';
import { SaleStatus } from '../types/enums';
import { Network } from '../../config/types/constants';
import { BigNumber } from 'bignumber.js';
import { Decimal128 } from 'mongoose';

export interface ICurrency {
    symbol: string;
    symbolId: number | null
}

export interface ISaleOrder {
    addrs: string[];
    uints: string[];
    feeMethod: FeeMethod;
    side: Side;
    saleKind: SaleKind;
    howToCall: HowToCall;
    calldata: string;
    replacementPattern: string;
    staticExtradata: string;
}

export interface ICardSaleDocument extends mongoose.Document {
    cardId: mongoose.Schema.Types.ObjectId | ICardDocument | string;
    readonly card?: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | ICardDocument;
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    readonly user?: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | IUserDocument;
    readonly userIdAsString?: mongoose.VirtualType | string | null;
    blockchain: Network;
    tokensCount: number;
    price: Decimal128 | number;
    bnPrice: BigNumber;
    currency: ICurrency;
    priceUsd: number;
    publishFrom: Date;
    publishTo: Date;
    saleContract: string;
    order: any[];
    orderParsed: ISaleOrder;
    orderHash: string;
    signature: string;
    status: SaleStatus;
}

export type ICardSaleLeanDocument = mongoose.LeanDocument<ICardSaleDocument>;

export type ICardSaleQuery<T> = ISchemaQuery<T, ICardSaleDocument>;

const CurrencySchema = new mongoose.Schema({
    symbolId: {
        type: Number,
        default: null
    },
    symbol: {
        type: String,
        required: true
    },
});

const OrderSchema = new mongoose.Schema({
    addrs: {
        type: [String],
        required: true
    },
    uints: {
        type: [String],
        required: true
    },
    feeMethod: {
        type: Number,
        enum: Object.values(FeeMethod),
        required: true
    },
    side: {
        type: Number,
        enum: Object.values(Side),
        required: true
    },
    saleKind: {
        type: Number,
        enum: Object.values(SaleKind),
        required: true
    },
    howToCall: {
        type: Number,
        enum: Object.values(HowToCall),
        required: true
    },
    calldata: {
        type: String,
        required: true
    },
    replacementPattern: {
        type: String,
        required: true
    },
    staticExtradata: {
        type: String,
        required: true
    }
});

const Schema = schemaCreator<ICardSaleDocument>(
    {
        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.card,
            required: true,
            alias: 'card'
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true,
            alias: 'user'
        },
        blockchain: {
            type: String,
            enum: Object.values(Network),
            default: Network.ETHEREUM,
            index: true
        },
        tokensCount: {
            type: Number,
            required: true
        },
        price: {
            type: mongoose.Schema.Types.Decimal128,
            required: true
        },
        currency: {
            type: CurrencySchema,
            required: true
        },
        priceUsd: {
            type: Number,
            required: true,
        },
        publishFrom: {
            type: Date,
            required: true,
            default: Date.now
        },
        publishTo: {
            type: Date,
            default: null
        },
        saleContract: {
            type: String,
            required: true
        },
        order: {
            type: [mongoose.Schema.Types.Mixed],
            required: true
        },
        orderParsed: {
            type: OrderSchema,
            required: true
        },
        orderHash: {
            type: String,
            required: true,
            index: true
        },
        signature: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: Object.values(SaleStatus),
            default: SaleStatus.sale
        },
    },
    {
        collection: DaoIds.cardSales
    }
);

Schema.virtual('userIdAsString').get(function () {
    try {
        return this.populated('userId') ? this.userId.id.toString() : this.userId.toString();
    } catch (e) {
        return null;
    }
});

Schema.virtual('bnPrice').get(function(): BigNumber {
    return new BigNumber(this.price);
});

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const CardSaleSchema = Schema;
