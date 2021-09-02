import * as mongoose from 'mongoose';
import { DaoIds } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';

export interface INonceDocument extends mongoose.Document {
    readonly name: string;
    readonly nonce: number;
}

export type INonceLeanDocument = mongoose.LeanDocument<INonceDocument>;

export type INonceQuery<T> = ISchemaQuery<T, INonceDocument>;

const Schema = schemaCreator(
    {
        name: {
            type: String,
            required: true,
            index: {
                unique: true
            }
        },
        nonce: {
            type: Number,
            required: true,
        }
    },
    {
        collection: DaoIds.nonce
    }
);

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const NonceSchema = Schema;
