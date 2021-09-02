import * as mongoose from 'mongoose';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { DaoIds } from '../../types/constants';
import { ZeroAddress } from '../../blockchain/types/constants';

export interface ICryptocurrencyPlatform {
    readonly id: number;
    readonly name: string;
    readonly symbol: string;
    readonly slug: string;
    readonly token_address: string;
}

export interface ICryptocurrencyDocument extends mongoose.Document {
    readonly id: number;
    readonly name: string;
    readonly symbol: string;
    readonly slug: string;
    readonly rank: number;
    readonly platform: ICryptocurrencyPlatform | null;
    readonly tokenAddress?: string;
}

export type ICryptocurrencyLeanDocument = mongoose.LeanDocument<ICryptocurrencyDocument>;

export type ICryptocurrencyQuery<T> = ISchemaQuery<T, ICryptocurrencyDocument>;

const PlatformSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true
    },
    token_address: {
        type: String,
        required: true
    },
});

const Schema = schemaCreator(
    {
        id: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        symbol: {
            type: String,
            required: true
        },
        slug: {
            type: String,
            required: true
        },
        rank: {
            type: Number,
            required: true
        },
        platform: {
            type: PlatformSchema,
            default: null
        }
    },
    {
        collection: DaoIds.cryptocurrencies
    }
);

Schema.virtual('tokenAddress').get(function () {
    return this.platform?.token_address ?? ZeroAddress;
});

export const CryptocurrencySchema = Schema;
