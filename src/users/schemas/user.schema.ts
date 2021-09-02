import * as mongoose from 'mongoose';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ILinks, IS3File, LinksSchema, S3FileSchema } from '../../types/scheme';

export interface IUserDocument extends mongoose.Document {
    readonly ethAddress: string;
    readonly name?: string;
    readonly fullName: mongoose.VirtualType | string;
    readonly verified: boolean;
    readonly description?: string;
    readonly slug?: string;
    readonly links?: ILinks;
    readonly avatar?: IS3File;
    readonly countFollowers?: mongoose.VirtualType | number;
}

export type IUserLeanDocument = mongoose.LeanDocument<IUserDocument>;

export type IUserQuery<T> = ISchemaQuery<T, IUserDocument>;

const Schema = schemaCreator(
    {
        ethAddress: {
            type: String,
            required: true,
            unique: true,
        },
        name: String,
        verified: {
            type: Boolean,
            default: false
        },
        description: String,
        slug: {
            type: String,
            index: {
                unique: true,
                partialFilterExpression: { slug: { $type: 'string' } }
            },
        },
        links: LinksSchema,
        avatar: {
            type: S3FileSchema
        },
    },
    {
        collection: DaoIds.users
    }
);

Schema.virtual('fullName').get(function () {
    return this.name || this.ethAddress;
});

Schema.virtual('countFollowers', {
    ref: DaoModelNames.follow,
    localField: '_id',
    foreignField: 'followUserId',
    count: true
});

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const UserSchema = Schema;
