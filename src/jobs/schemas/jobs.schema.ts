import * as mongoose from 'mongoose';
import { DaoIds } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { JobType } from '../types/enums';
import { Network } from '../../config/types/constants';

export interface IJobDocument extends mongoose.Document {
    readonly type: string;
    readonly contractAddress: string | null;
    readonly processingBlockNumber: number | null;
    readonly processingBlockTime: Date | null;
}

export type IJobLeanDocument = mongoose.LeanDocument<IJobDocument>;

export type IJobQuery<T> = ISchemaQuery<T, IJobDocument>;

const Schema = schemaCreator<IJobDocument>(
    {
        network: {
            type: String,
            required: true,
            enum: Object.values(Network),
        },
        type: {
            type: String,
            required: true,
            enum: Object.values(JobType),
        },
        contractAddress: {
            type: String,
            default: null
        },
        processingBlockNumber: {
            type: Number,
            default: null
        },
        processingBlockTime: {
            type: Date,
            default: null
        },
    },
    {
        collection: DaoIds.jobs
    }
);

Schema.index({ network: 1, type: 1 }, { unique: true });
Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const JobSchema = Schema;
