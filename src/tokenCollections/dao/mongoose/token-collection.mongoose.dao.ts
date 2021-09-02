import { InjectModel } from '@nestjs/mongoose';
import { DaoIds, DaoModelNames, SortOrder } from '../../../types/constants';
import { Model } from 'mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { ITokenCollectionDocument, ITokenCollectionQuery } from '../../schemas/token-collection.schema';
import { TokenCollectionDao, IGetListQuery } from '../token-collection.dao';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { IPaginatedList } from '../../../types/common';
import { ObjectID } from 'mongodb';
import { Network } from '../../../config/types/constants';
import { IContractMetadataDocument } from '../../../metadata/schemas/contract-metadata.schema';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { GetUserCollectionsDto } from '../../dto/request/get-user-collections.dto';
import { UpdateTokenCollectionDto } from '../../dto/request/update-token-collection.dto';
import { IS3File } from '../../../types/scheme';

@Injectable()
export class TokenCollectionMongooseDao extends DaoMongoose implements TokenCollectionDao {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    @InjectSentry()
    private readonly sentryService: SentryService;

    @InjectModel(DaoModelNames.tokenCollection)
    private readonly tokenCollectionModel: Model<ITokenCollectionDocument>;

    protected get model(): Model<ITokenCollectionDocument> {
        return this.tokenCollectionModel;
    }

    async getUserCreatedCollections(
        userId: string,
        limit: number,
        offset: number,
        sort: SortOrder
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        const query = this.tokenCollectionModel.find() as ITokenCollectionQuery<
            Array<ITokenCollectionDocument>
        >;
        const filter = query.findByUserId(userId).getFilter();

        const data = await query
            .find(filter)
            .sort({ _id: sort })
            .skip(offset)
            .limit(limit)
            .populate({
                path: 'cards',
                options: { sort: { _id: -1 } },
                perDocumentLimit: TokenCollectionDao.LIMIT_CARDS_PER_COLLECTION
            })
            .populate({
                path: 'cardsCount'
            });
        const total = await this.tokenCollectionModel.find(filter).countDocuments();

        return { data, total, offset, limit };
    }

    async getUserCollections(
        sUserId: string,
        { sort, offset, limit, created }: GetUserCollectionsDto
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        const userId = new ObjectID(sUserId);
        const mainQuery = [];

        if (created) {
            mainQuery.push({ $match: { userId } });
        }

        mainQuery.push(...[
            {
                $lookup: {
                    from: DaoIds.cards,
                    let: { letCollectionId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$letCollectionId', '$tokenCollectionId'] },
                                balances: { $elemMatch: { userId } },
                            }
                        },
                        {
                            $limit: TokenCollectionDao.LIMIT_CARDS_PER_COLLECTION
                        }
                    ],
                    as: 'cards'
                }
            },
            {
                $match: {
                    $or: [ { cards: { $ne: [] } }, { userId } ]
                }
            }
        ]);

        const query = [
            ...mainQuery,
            {
                $lookup: {
                    from: DaoIds.cards,
                    localField: '_id',
                    foreignField: 'tokenCollectionId',
                    as: 'allCards'
                }
            },
            {
                $lookup: {
                    from: DaoIds.users,
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    cardsCount: { $size: '$allCards' }
                }
            },
            {
                $project: {
                    allCards: 0
                }
            }
        ];

        const data = await this.tokenCollectionModel
            .aggregate(query)
            .sort({ _id: sort })
            .skip(offset)
            .limit(limit);
        const [count] = await this.tokenCollectionModel.aggregate(mainQuery).count('res');

        return { data, total: count?.res ?? 0, offset, limit };
    }

    async getCollectionsListByFilter(
        {
            name,
            categories,
            offset,
            limit,
            createdAtOrder = SortOrder.asc,
            popularityOrder = SortOrder.asc
        }: IGetListQuery,
        lean = false
    ): Promise<ITokenCollectionDocument[]> {
        const find = {
            ...( categories ? { categoryIds: { $in: categories } } : null),
            ...( name ? { name: { $regex: `^.*(${name}).*$`, $options: 'i' } } : null)
        };

        const query = this.tokenCollectionModel.find(find)
            .skip(offset)
            .sort({ createdAt: createdAtOrder, popularity: popularityOrder })
            .limit(limit) as ITokenCollectionQuery<ITokenCollectionDocument[]>;

        if (lean) {
            query.additionalLean();
        }

        return query;
    }

    async getCollectionsTotalRecordsByFilter({ name, categories }: IGetListQuery): Promise<number> {
        const query = {
            ...(categories ? { categoryIds: { $in: categories } } : null),
            ...(name ? { name: { $regex: `^.*(${name}).*$`, $options: 'i' } } : null)
        };

        return this.tokenCollectionModel.find(query).countDocuments();
    }

    async getCollectionsListByIds(
        ids: string[],
        limit: number,
        offset: number,
        sort: SortOrder
    ): Promise<IPaginatedList<ITokenCollectionDocument>> {
        const query: any = {
            _id: { $in: ids }
        };

        const data = await this.tokenCollectionModel.find(query)
            .populate({
                path: 'cards',
                options: { sort: { _id: -1 } },
                perDocumentLimit: TokenCollectionDao.LIMIT_CARDS_PER_COLLECTION
            })
            .populate('cardsCount')
            .populate('userId')
            .skip(offset)
            .sort({ _id: sort })
            .limit(limit)
            .exec();
        const total = await this.tokenCollectionModel.find(query).countDocuments();

        return { data, total, offset, limit };
    }

    async findCollectionByContractId(contractId: string): Promise<ITokenCollectionDocument | null> {
        return this.tokenCollectionModel.findOne({ contractId: contractId.toLowerCase() });
    }

    async createCollection(
        blockchain: Network,
        contractId: string,
        userId: string,
        name: string,
        metadata?: IContractMetadataDocument,
        uri?: string
    ): Promise<ITokenCollectionDocument | null> {
        const { symbol, description, logo, slug, links } = metadata ?? {};
        try {
            return await this.tokenCollectionModel.create({
                contractId: contractId.toLowerCase(),
                blockchain,
                userId,
                name,
                symbol,
                description,
                logo,
                slug,
                links,
                uri
            });
        } catch (exception) {
            this.sentryService.captureException(exception);
            this.logger.error('A caught error on creating collection:', exception);

            return null;
        }
    }

    async updateCollection(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<ITokenCollectionDocument> {
        return this.model.findOneAndUpdate(
            { slug },
            { ...data, ...( logo ? { logo } : null ) }
        );
    }
}
