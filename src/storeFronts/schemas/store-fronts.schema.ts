import * as mongoose from 'mongoose';
import { schemaCreator } from '../../helpers/schema-creator';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ILinks, IS3File, LinksSchema, S3FileSchema } from '../../types/scheme';
import {
    CollectiblesChooseType,
    CollectiblesSortType,
    StoreFrontCardStatus,
    StoreFrontCollectionStatus,
    StoreFrontPage,
    StoreFrontPageBlock
} from '../types/enums';
import { ICardsInstance } from '../types/scheme';

export interface IStoreFrontCard {
    cardId: mongoose.Types.ObjectId | string;
    status: StoreFrontCardStatus
}

export interface IStoreFrontCollection {
    collectionId: mongoose.Types.ObjectId | string;
    status?: StoreFrontCollectionStatus;
}

export interface IStoreFrontPageBlockSettingTexts {
    name: string,
    headline: string
}

export interface IStoreFrontPageBlockSettingCollectibles {
    choose?: CollectiblesChooseType;
    collections?: string[];
    cards?: string[];
    itemsType?: StoreFrontCardStatus;
    sort?: CollectiblesSortType;
    itemSize?: string;
    rows?: number;
    showMore?: boolean;
}

export interface IStoreFrontPageBlockSettingConfig {
    backgroundColor?: string;
}

export interface IStoreFrontPageBlockSetting {
    texts: IStoreFrontPageBlockSettingTexts;
    collectibles?: IStoreFrontPageBlockSettingCollectibles;
    settings?: IStoreFrontPageBlockSettingConfig;
    links?: ILinks;
}

export interface IStoreFrontPageBlock {
    type: StoreFrontPageBlock;
    settings: IStoreFrontPageBlockSetting;
    sortOrder?: number | null;
    isVisible?: boolean;
}

export interface IStoreFrontPage {
    name: StoreFrontPage;
    blocks?: IStoreFrontPageBlock[];
}

export interface IStoreFrontDocument extends mongoose.Document {
    readonly name: string;
    readonly logo?: IS3File;
    readonly owner: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    readonly cards?: Array<IStoreFrontCard | ICardsInstance>;
    readonly collections?: IStoreFrontCollection[];
    readonly slug?: string;
    readonly fee?: number;
    readonly payoutAddress?: string;
    readonly paymentTokens?: string[];
    readonly pages?: IStoreFrontPage[];
    readonly release?: string | mongoose.LeanDocument<Omit<IStoreFrontDocument, 'release'>>;
}

export type IStoreFrontLeanDocument = mongoose.LeanDocument<IStoreFrontDocument>;

const cardsSchema = new mongoose.Schema(
    {
        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.card,
            alias: 'card',
            required: true
        },
        status: {
            type: StoreFrontCardStatus,
            required: false,
            default: StoreFrontCardStatus.ON_SALE
        }
    },
    { _id : false }
);

const collectionsSchema = new mongoose.Schema(
    {
        collectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.tokenCollection,
            alias: 'collection',
            required: true
        },
        status: {
            type: StoreFrontCollectionStatus,
            required: false,
            default: null
        }
    },
    { _id : false }
);

const collectiblesBlockSchema = new mongoose.Schema(
    {
        choose: {
            type: String,
            enum: Object.values(CollectiblesChooseType),
        },
        collections: {
            type: [String],
        },
        cards: {
            type: [String],
        },
        itemsType: {
            type: String,
            enum: Object.values(StoreFrontCardStatus),
        },
        sort: {
            type: String,
            enum: Object.values(CollectiblesSortType),
        },
        itemSize: {
            type: String,
        },
        rows: {
            type: Number,
        },
        showMore: {
            type: Boolean,
        }
    }
);

const settingsBlockSchema = new mongoose.Schema(
    {
        backgroundColor: {
            type: String,
        },
    }
);

const pageBlockSettingSchema = new mongoose.Schema(
    {
        texts: {
            type: new mongoose.Schema({ name: String, headline: String }),
            required: true
        },
        collectibles: {
            type: collectiblesBlockSchema,
            default: {}
        },
        settings: {
            type: settingsBlockSchema,
            default: {}
        },
        links: {
            type: LinksSchema,
            default: {}
        }
    }
);

const pageBlockSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(StoreFrontPageBlock),
            required: true
        },
        settings: {
            type: pageBlockSettingSchema,
            required: true
        },
        sortOrder: {
            type: Number,
            default: null
        },
        isVisible: {
            type: Boolean,
            default: true
        }
    }
);

const pageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            enum: Object.values(StoreFrontPage),
            required: true
        },
        blocks: {
            type: [pageBlockSchema],
            default: []
        }
    }
);


const Schema = schemaCreator(
    {
        name: {
            type: String,
            required: true
        },
        logo: S3FileSchema,
        slug: {
            type: String,
            default: null,
            index: {
                unique: true,
                partialFilterExpression: { slug: { $type: 'string' } }
            },
        },
        fee: {
            type: Number,
            required: false
        },
        payoutAddress: {
            type: String,
            required: false
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true
        },
        cards: [cardsSchema],
        collections: [collectionsSchema],
        pages: {
            type: [pageSchema],
            default: []
        },
        release: {
            type: String,
            default: null,
            get: release => release ? JSON.parse(release) : null,
        }
    },
    {
        collection: DaoIds.storeFronts
    }
);

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const StoreFrontSchema = Schema;
