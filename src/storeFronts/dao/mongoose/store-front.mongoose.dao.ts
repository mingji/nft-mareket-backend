import { Injectable } from '@nestjs/common';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { StoreFrontDao } from '../store-front.dao';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { Model } from 'mongoose';
import {
    IStoreFrontCollection,
    IStoreFrontDocument,
} from '../../schemas/store-fronts.schema';
import { IS3File } from '../../../types/scheme';
import { ICardsInstance } from '../../types/scheme';
import { StoreFrontPageBlockDto } from '../../dto/store-front-page-blocks-settings.dto';
import { StoreFrontPage } from '../../types/enums';
import { PaginatedRequestDto } from '../../../dto/paginated-request.dto';
import { IPaginatedList } from '../../../types/common';

@Injectable()
export class StoreFrontMongooseDao extends DaoMongoose implements StoreFrontDao {
    @InjectModel(DaoModelNames.storeFront) private readonly storeFrontModel: Model<IStoreFrontDocument>;

    protected get model(): Model<IStoreFrontDocument> {
        return this.storeFrontModel;
    }

    async create(owner: string, name: string, logo: IS3File): Promise<IStoreFrontDocument | null> {
        return this.storeFrontModel.create({ owner, name, logo });
    }

    async addCards(id: string, cards: ICardsInstance[]): Promise<void> {
        await this.storeFrontModel.findByIdAndUpdate(
            id,
            {
                $addToSet: {
                    cards: { $each: cards }
                }
            }
        );
    }

    async deleteCards(id: string, cardsIds: string[]): Promise<void> {
        await this.storeFrontModel.updateOne(
            { _id: id },
            { $pull: { cards: { cardId: { $in: cardsIds } } } },
            { multi: true }
        );
    }

    async getBySlug(slug: string): Promise<IStoreFrontDocument | null> {
        return this.storeFrontModel.findOne({ slug });
    }

    async addCollections(id: string, collections: IStoreFrontCollection[]): Promise<void> {
        await this.storeFrontModel.findByIdAndUpdate(
            id,
            {
                $addToSet: {
                    collections: { $each: collections }
                }
            }
        );
    }

    async deleteCollections(id: string, collectionIds: string[]): Promise<void> {
        await this.storeFrontModel.updateOne(
            { _id: id },
            { $pull: { collections: { collectionId: { $in: collectionIds } } } },
            { multi: true }
        );
    }

    async updateSettings(
        id: string,
        name?: string,
        slug?: string,
        fee?: number,
        payoutAddress?: string,
        paymentTokens?: string[],
        logo?: IS3File
    ): Promise<void> {
        const updateBody = Object.assign({},
            name ? { name } : {},
            slug ? { slug } : {},
            fee ? { fee } : {},
            payoutAddress ? { payoutAddress } : {},
            logo ? { logo } : {},
            paymentTokens && paymentTokens.length ? { paymentTokens } : {}
        );
        await this.storeFrontModel.updateOne(
            { _id: id },
            updateBody
        );
    }

    async storePageSetting(
        storeFrontId: string,
        page: StoreFrontPage,
        settings: StoreFrontPageBlockDto
    ): Promise<IStoreFrontDocument> {
        const res = await this.storeFrontModel.findOneAndUpdate(
            { _id: storeFrontId, 'pages.name': page },
            { 'pages.$.blocks': settings }
        );

        if (!res) {
            return this.storeFrontModel.findByIdAndUpdate(
                storeFrontId,
                {
                    $addToSet: {
                        pages: {
                            name: page,
                            blocks: settings
                        }
                    }
                }
            );
        }

        return res;
    }

    async publishStoreFront(id: string, release: string, slug?: string): Promise<void> {
        await this.storeFrontModel.findByIdAndUpdate(id, { release, ...( slug ? { slug } : null ) });
    }

    async existCollectionsInStoreFront(_id: string, collectionIds: string[]): Promise<boolean> {
        return this.model.exists({
            _id,
            'collections.collectionId': { $all: collectionIds }
        });
    }

    async existCardsInStoreFront(_id: string, cardIds: string[]): Promise<boolean> {
        return this.model.exists({
            _id,
            'cards.cardId': { $all: cardIds }
        });
    }

    async getStoreFrontsByUserId(
        owner: string,
        { limit, offset }: PaginatedRequestDto
    ): Promise<IPaginatedList<IStoreFrontDocument>> {
        const data = await this.storeFrontModel.find({ owner }).skip(offset).limit(limit);
        const total = await this.storeFrontModel.find({ owner }).countDocuments();

        return { data, total, offset, limit };
    }
}
