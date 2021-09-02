import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';

export interface IUserSessionDocument extends mongoose.Document {
    readonly userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    readonly user: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | IUserDocument;
    readonly expireAt: Date;
    readonly isActive: boolean;
}

export type IUserSessionLeanDocument = mongoose.LeanDocument<IUserSessionDocument>;

export type IUserSessionQuery<T> = ISchemaQuery<T, IUserSessionDocument>;

const Schema = schemaCreator(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true,
            alias: 'user'
        },
        expireAt: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true
        }
    },
    {
        collection: DaoIds.userSessions
    }
);

export const UserSessionSchema = Schema;
