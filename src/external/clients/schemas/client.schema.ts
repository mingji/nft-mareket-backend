import * as mongoose from 'mongoose';
import { DaoIds } from '../../../types/constants';
import { EncryptedSchema, IEncryptedData } from '../../../types/scheme';
import { ISchemaQuery, schemaCreator } from '../../../helpers/schema-creator';

export interface IClientDocument extends mongoose.Document {
    readonly clientId: string;
    readonly clientSecret: IEncryptedData;
    readonly name: string;
    readonly description?: string;
    readonly webhookUrl?: string;
}

export type IClientLeanDocument = mongoose.LeanDocument<IClientDocument>;

export type IClientQuery<T> = ISchemaQuery<T, IClientDocument>;

const Schema = schemaCreator(
    {
        clientId: {
            type: String,
            required: true,
            unique: true,
        },
        clientSecret: {
            type: EncryptedSchema,
            required: true
        },
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: String,
        webhookUrl: {
            type: String,
            default: null
        },
    },
    {
        collection: DaoIds.externalClients
    }
);

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const ClientSchema = Schema;
