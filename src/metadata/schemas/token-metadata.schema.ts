import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { IS3File, S3FileSchema } from '../../types/scheme';
import { DisplayType } from '../types/enums';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { IContractMetadataDocument } from './contract-metadata.schema';
import { IBasicTokenMetadataProperties } from '../types/scheme';

export interface ITokenMetadataAttribute {
    trait_type?: string;
    value: any;
    max_value?: number;
    display_type?: DisplayType;
}

export interface ITokenMetadataDocument extends mongoose.Document {
    tokenCollectionId: mongoose.Schema.Types.ObjectId | ITokenCollectionDocument | string | null;
    tokenCollection: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | ITokenCollectionDocument;
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    contractMetadataId: mongoose.Schema.Types.ObjectId | IContractMetadataDocument | string;
    contractMetadata: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | IContractMetadataDocument;
    contractAddress: string | null;
    token_identifier: number;
    image: IS3File;
    image_data?: string;
    external_url?: string;
    description?: string | null;
    decimals?: number | null;
    name: string;
    properties?: IBasicTokenMetadataProperties | null;
    attributes?: ITokenMetadataAttribute[];
    background_color?: string;
    animation?: IS3File;
    youtube_url?: string;
}

export type ITokenMetadataLeanDocument = mongoose.LeanDocument<ITokenMetadataDocument>;

export type ITokenMetadataQuery<T> = ISchemaQuery<T, ITokenMetadataDocument>;

const AttributeSchema = new mongoose.Schema({
    trait_type: {
        type: String,
        default: null,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    max_value: {
        type: Number,
        default: null
    },
    display_type: {
        type: String,
        enum: Object.values(DisplayType).concat([null]),
        default: null
    }
});

const Schema = schemaCreator(
    {
        tokenCollectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.tokenCollection,
            default: null,
            alias: 'tokenCollection'
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true,
        },
        contractMetadataId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.contractMetadata,
            required: true,
            alias: 'contractMetadata'
        },
        contractAddress: {
            type: String,
            index: true,
            default: null,
        },
        token_identifier: {
            type: Number,
            required: true
        },
        image: {
            type: S3FileSchema,
            required: true
        },
        image_data: {
            type: String,
            default: null,
        },
        external_url: {
            type: String,
            default: null,
        },
        description: {
            type: String,
            default: null,
        },
        decimals: {
            type: Number,
            default: null,
        },
        name: {
            type: String,
            required: true
        },
        attributes: {
            type: [AttributeSchema],
            default: null,
        },
        properties: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        background_color: {
            type: String,
            default: null,
        },
        animation: {
            type: S3FileSchema,
            default: null,
        },
        youtube_url: {
            type: String,
            default: null,
        },
    },
    {
        collection: DaoIds.tokenMetadata
    }
);

Schema.index({ contractMetadataId: 1, token_identifier: 1 }, { unique: true });
Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const TokenMetadataSchema = Schema;
