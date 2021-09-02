import * as mongoose from 'mongoose';
import { ICardSaleDocument } from '../cardSales/schemas/card-sales.schema';
import { IBalanceCard } from '../cards/schemas/cards.schema';

export interface IS3File {
    key: string;
    location: string;
    etag: string;
    bucket: string;
    mimetype: string;
    extension: string;
    provider?: string;
    title?: string;
    size?: number;
    buffer?: Buffer;
}

export interface IS3FilePublic {
    key: string;
    location: string;
    bucket: string;
    mimetype: string;
    extension: string;
}

export const S3FileSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    etag: {
        type: String,
        required: true
    },
    bucket: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        default: null
    },
    extension: {
        type: String,
        default: null
    },
    provider: String,
    title: String,
    size: Number,
    buffer: Buffer
});

export interface ILinks {
    website?: string;
    twitter?: string;
    medium?: string;
    telegram?: string;
    discord?: string;
}

export const LinksSchema = new mongoose.Schema({
    website: String,
    twitter: String,
    medium: String,
    telegram: String,
    discord: String
});

export interface ICardListings {
    cardSales: ICardSaleDocument[],
    cardBalances: Partial<IBalanceCard>[]
}

export interface ISaleCurrencies {
    symbols: string[];
    symbolsIds: number[];
}

export interface INonce {
    value: number;
    name?: string;
}

export interface IEncryptedData {
    iv: string;
    content: string;
}

export const EncryptedSchema = new mongoose.Schema({
    iv: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    }
});