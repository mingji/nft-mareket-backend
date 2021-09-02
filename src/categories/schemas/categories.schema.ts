import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { TLocalesDictionary } from '../../types/common';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { IS3File, S3FileSchema } from '../../types/scheme';

export interface ICategoryDocument extends mongoose.Document {
    readonly icon: IS3File;
    readonly title: TLocalesDictionary;
    readonly description?: TLocalesDictionary;
    readonly parentId?: string;
    readonly order?: number;
    readonly isTopCategory?: boolean;
    readonly createdAt?: Date;
    readonly tokenCollections?: mongoose.VirtualType | ITokenCollectionDocument[];
}

export type ICategoryLeanDocument = mongoose.LeanDocument<ICategoryDocument>;

export type ICategoryQuery<T> = ISchemaQuery<T, ICategoryDocument>;

const schema = schemaCreator({
    icon: S3FileSchema,
    title: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    description: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    parentId: String,
    order: Number,
    isTopCategory: Boolean
}, {
    collection: DaoIds.categories
});

schema.virtual('tokenCollections', {
    ref: DaoModelNames.tokenCollection,
    localField: '_id',
    foreignField: 'categoryIds',
    justOne: false,
    get: (tokenCollections: ITokenCollectionDocument[]) => {
        return [...new Set(tokenCollections.map(collection => collection.id))]
            .map(collectionId => tokenCollections.find(collection => collection.id === collectionId));
    }
});

export const CategorySchema = schema;