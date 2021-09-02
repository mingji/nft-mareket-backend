import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { ILinks, IS3File, LinksSchema, S3FileSchema } from '../../types/scheme';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';

export interface IContractMetadataDocument extends mongoose.Document {
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    tokenCollectionId: mongoose.Schema.Types.ObjectId | ITokenCollectionDocument | string | null;
    contractAddress: string | null;
    slug: string;
    symbol: string;
    name: string;
    description: string | null;
    logo?: IS3File;
    links?: ILinks;
}

export type IContractMetadataLeanDocument = mongoose.LeanDocument<IContractMetadataDocument>;

export type IContractMetadataQuery<T> = ISchemaQuery<T, IContractMetadataDocument>;

const Schema = schemaCreator(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true,
        },
        tokenCollectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.tokenCollection,
            default: null,
            index: {
                unique: true,
                partialFilterExpression: { tokenCollectionId: { $type: 'objectId' } }
            }
        },
        contractAddress: {
            type: String,
            default: null,
            index: {
                unique: true,
                partialFilterExpression: { contractAddress: { $type: 'string' } }
            }
        },
        slug: {
            type: String,
            unique: true,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        symbol: {
            type: String,
            default: null
        },
        description: {
            type: String,
            default: null
        },
        logo: {
            type: S3FileSchema,
            default: null
        },
        links: LinksSchema,
    },
    {
        collection: DaoIds.contractMetadata
    }
);

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const ContractMetadataSchema = Schema;
