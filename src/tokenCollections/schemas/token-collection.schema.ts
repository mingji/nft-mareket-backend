import * as mongoose from 'mongoose';
import { ILinks, IS3File, IS3FilePublic, LinksSchema, S3FileSchema } from '../../types/scheme';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ICardDocument } from '../../cards/schemas/cards.schema';
import { ICategoryDocument } from 'src/categories/schemas/categories.schema';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { blockchainConfig, IAllowedCurrency } from '../../config';
import { Network } from '../../config/types/constants';

export interface ISaleContract {
    saleContract: string;
    saleContractProxy: string;
    allowedCryptocurrencies: IAllowedCurrency[];
    marketPlaceFeeAddress: string;
}

export interface ITokenCollectionDocument extends mongoose.Document {
    contractId: string;
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    user: mongoose.VirtualType | mongoose.Schema.Types.ObjectId | IUserDocument;
    cards: mongoose.VirtualType | Array<ICardDocument>;
    cardsCount: mongoose.VirtualType | number;
    name: string;
    symbol: string | null;
    logo?: IS3File;
    logoPublic?: IS3FilePublic | null;
    description?: string;
    slug?: string;
    links?: ILinks;
    categoryIds: Array<mongoose.Schema.Types.ObjectId>;
    categories: mongoose.VirtualType | Array<ICategoryDocument>; 
    popularity: number;
    createdAt: Date;
    blockchain: Network;
    saleContract: ISaleContract;
    uri?: string;
}

export type ITokenCollectionLeanDocument = mongoose.LeanDocument<ITokenCollectionDocument>;

export interface ITokenCollectionQuery<T> extends ISchemaQuery<T, ITokenCollectionDocument> {
    findByUserId(userId: string): ITokenCollectionQuery<T>;
}

const AllowedCurrencySchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true
    },
    tokenAddress: {
        type: String,
        required: true
    },
});

const SaleContractSchema = new mongoose.Schema({
    saleContract: {
        type: String,
        required: true
    },
    saleContractProxy: {
        type: String,
        required: true
    },
    allowedCryptocurrencies: {
        type: [AllowedCurrencySchema],
        required: true
    },
    marketPlaceFeeAddress: {
        type: String,
        required: true
    }
});

const Schema = schemaCreator(
    {
        contractId: {
            type: String,
            required: true,
            default: null,
            index: {
                unique: true,
                partialFilterExpression: { contractId: { $type: 'string' } }
            }
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true,
            alias: 'user'
        },
        categoryIds: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: DaoModelNames.category
            }],
            default: [],
            alias: 'categories'
        },
        popularity: {
            type: Number,
            default: 0
        },
        name: {
            type: String,
            required: true,
            index: {
                text: true
            }
        },
        symbol: {
            type: String,
            default: null
        },
        logo: {
            type: S3FileSchema
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
        blockchain: {
            type: String,
            enum: Object.values(Network),
            default: Network.ETHEREUM
        },
        saleContract: {
            type: SaleContractSchema,
            default: null,
            get: function(contract): ISaleContract {
                if (contract) {
                    return contract;
                }

                const {
                    marketPlaceFeeAddress,
                    [this.blockchain as Network]: { saleContractProxy, saleContract, allowedCryptocurrencies }
                } = blockchainConfig();

                return {
                    saleContract,
                    saleContractProxy,
                    allowedCryptocurrencies,
                    marketPlaceFeeAddress
                };
            }
        },
        uri: String
    },
    {
        collection: DaoIds.tokenCollections
    }
);

Schema.query.findByUserId = function (userId: string) {
    return this.find({ userId });
};

Schema.virtual('cards', {
    ref: DaoModelNames.card,
    localField: '_id',
    foreignField: 'tokenCollectionId',
    justOne: false
});

Schema.virtual('cardsCount', {
    ref: DaoModelNames.card,
    localField: '_id',
    foreignField: 'tokenCollectionId',
    count: true
});

Schema.virtual('logoPublic').get(function () {
    if (!this.logo) {
        return null;
    }
    const { key, location, bucket } = this.logo;

    return { key, location, bucket };
});

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const TokenCollectionSchema = Schema;
