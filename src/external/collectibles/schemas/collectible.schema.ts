import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../../helpers/schema-creator';
import { IClientDocument } from '../../clients/schemas/client.schema';
import { ITokenMetadataDocument } from '../../../metadata/schemas/token-metadata.schema';

export interface ICollectibleDocument extends mongoose.Document {
    readonly clientId: mongoose.Schema.Types.ObjectId | IClientDocument | string;
    readonly externalCollectibleId: string;
    readonly externalCreatorId: string;
    readonly externalCreatorEmail: string;
    readonly maxSupply: number;
    readonly distributedCount: number;
    readonly externalStoreId?: string;
    readonly tokenMetadataId?: mongoose.Schema.Types.ObjectId | ITokenMetadataDocument | string;
}

export type ICollectibleLeanDocument = mongoose.LeanDocument<ICollectibleDocument>;

export type ICollectibleQuery<T> = ISchemaQuery<T, ICollectibleDocument>;

const Schema = schemaCreator(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.externalClient,
            required: true,
        },
        externalCollectibleId: {
            type: String,
            required: true,
            index: true
        },
        externalCreatorId: {
            type: String,
            required: true
        },
        externalCreatorEmail: {
            type: String,
            required: true
        },
        maxSupply: {
            type: Number,
            required: true
        },
        distributedCount: {
            type: Number,
            default: 0
        },
        externalStoreId: {
            type: String,
            default: null
        },
        tokenMetadataId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.tokenMetadata,
            required: true,
        }
    },
    {
        collection: DaoIds.externalCollectibles
    }
);

Schema.index({ clientId: 1, externalCollectibleId: 1 }, { unique: true });
Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const CollectibleSchema = Schema;
