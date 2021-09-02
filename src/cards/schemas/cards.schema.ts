import * as mongoose from 'mongoose';
import { IS3File, IS3FilePublic, S3FileSchema } from '../../types/scheme';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { ICategoryDocument } from '../../categories/schemas/categories.schema';
import { ICardSaleDocument } from '../../cardSales/schemas/card-sales.schema';
import { EIP } from '../../config/types/constants';

export interface IFileCard {
    original: IS3File | null;
    preview?: IS3File;
}

export interface IFilePublicCard {
    original: IS3FilePublic;
    preview: IS3FilePublic;
}

export interface IPropertyCard {
    property: string;
    value: string;
}

export interface IBalanceCard {
    balanceId: string;
    tokenAmount: number;
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    user?: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | IUserDocument;
    ethAddress: string;
}

export interface ICardDocument extends mongoose.Document {
    tokenId: string;
    eipVersion: EIP;
    identifier: number;
    uri: string | null;
    totalSupply: number;
    creator: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    balances: IBalanceCard[];
    hasSale: boolean;
    tokenCollectionId: mongoose.Schema.Types.ObjectId | ITokenCollectionDocument | string;
    tokenCollection?: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | ITokenCollectionDocument;
    categoryId?: mongoose.Schema.Types.ObjectId | ICategoryDocument | string | null;
    category?: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | ICategoryDocument;
    name: string | null;
    file: IFileCard;
    filePublic?: mongoose.VirtualType | IFilePublicCard;
    preview?: mongoose.VirtualType | IS3File;
    isPrivate?: boolean;
    description?: string;
    properties?: Array<IPropertyCard>;
    lockedData?: string;
    sales?: mongoose.VirtualType | Array<ICardSaleDocument>;
    viewersCount?: number;
    likes?: mongoose.Types.ObjectId[] | string[];
    dislikes?: mongoose.Types.ObjectId[] | string[];
}

export type ICardLeanDocument = mongoose.LeanDocument<ICardDocument>;

export type ICardQuery<T> = ISchemaQuery<T, ICardDocument>;

const FileSchema = new mongoose.Schema({
    original: {
        type: S3FileSchema,
        default: null
    },
    preview: S3FileSchema
});

const PropertySchema = new mongoose.Schema({
    property: {
        type: String,
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
});

const BalanceSchema = new mongoose.Schema({
    balanceId: {
        type: String,
        required: true
    },
    tokenAmount: {
        type: Number,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DaoModelNames.user,
        alias: 'user',
        required: true
    },
    ethAddress: {
        type: String,
        required: true
    }
});

const Schema = schemaCreator(
    {
        tokenId: {
            type: String,
            required: true,
            unique: true,
        },
        eipVersion: {
            type: String,
            enum: Object.values(EIP),
            required: true
        },
        identifier: {
            type: Number,
            required: true
        },
        uri: {
            type: String,
            default: null
        },
        totalSupply: {
            type: Number,
            required: true
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true
        },
        balances: {
            type: [BalanceSchema],
            required: true
        },
        hasSale: {
            type: Boolean,
            required: true,
            default: false
        },
        tokenCollectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.tokenCollection,
            required: true,
            alias: 'tokenCollection'
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.category,
            alias: 'category',
            default: null
        },
        name: {
            type: String,
            default: null,
            index: {
                text: true
            }
        },
        file: {
            type: FileSchema,
            required: true
        },
        isPrivate: {
            type: Boolean,
            default: false
        },
        description: String,
        properties: [PropertySchema],
        lockedData: {
            type: String,
            default: null
        },
        viewersCount: {
            type: Number,
            default: 0
        },
        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: DaoModelNames.user,
            default: []
        },
        dislikes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: DaoModelNames.user,
            default: []
        }
    },
    {
        collection: DaoIds.cards
    }
);

Schema.virtual('preview').get(function () {
    return this.file?.preview || this.file?.original;
});

Schema.virtual('filePublic').get(function () {
    if (!this.file) {
        return { original: {}, preview: {} };
    }

    const { original, preview } = this.file;

    return {
        original: {
            key: original.key,
            location: original.location,
            bucket: original.bucket,
            extension: original.extension,
            mimetype: original.mimetype,
        },
        preview: {
            key: preview?.key,
            location: preview?.location,
            bucket: preview?.bucket,
            extension: preview?.extension,
            mimetype: preview?.mimetype,
        }
    };
});

Schema.virtual('sales', {
    ref: DaoModelNames.cardSale,
    localField: '_id',
    foreignField: 'cardId',
    justOne: false
});

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const CardSchema = Schema;
