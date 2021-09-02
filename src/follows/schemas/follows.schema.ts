import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { IUserDocument } from '../../users/schemas/user.schema';
import { FollowType } from '../types/enums';

export interface IFollowDocument extends mongoose.Document {
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    followUserId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
}

export type IFollowLeanDocument = mongoose.LeanDocument<IFollowDocument>;

export type IFollowQuery<T> = ISchemaQuery<T, IFollowDocument>;

export const FollowTypeField = {
    [FollowType.FOLLOWINGS]: 'userId',
    [FollowType.FOLLOWERS]: 'followUserId',
};

export const FollowTypeRefField = {
    [FollowType.FOLLOWERS]: 'userId',
    [FollowType.FOLLOWINGS]: 'followUserId',
};

const Schema = schemaCreator<IFollowDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true
        },
        followUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true
        },
    },
    {
        collection: DaoIds.follows
    }
);

Schema.index({ userId: 1, followUserId: 1 }, { unique: true });
Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const FollowSchema = Schema;
