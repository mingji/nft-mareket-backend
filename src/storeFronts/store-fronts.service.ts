import { Injectable } from '@nestjs/common';
import { CreateStoreFrontDto } from './dto/create-store-front.dto';
import { StoreFrontDao } from './dao/store-front.dao';
import {
    IStoreFrontCard,
    IStoreFrontDocument,
    IStoreFrontLeanDocument,
    IStoreFrontPage
} from './schemas/store-fronts.schema';
import { IS3File } from '../types/scheme';
import { IPaginatedList } from '../types/common';
import { ICardDocument } from '../cards/schemas/cards.schema';
import { CardsService } from '../cards/cards.service';
import { StoreFrontGetCardsQueryDto } from './dto/store-front-get-cards-query.dto';
import { TokenCollectionsService } from '../tokenCollections/token-collections.service';
import { StoreFrontGetCollectionsQueryDto } from './dto/store-front-get-collections-query.dto';
import { SortOrder } from '../types/constants';
import { StoreFrontUpdateSettingsDto } from './dto/store-front-update-settings.dto';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { StoreFrontPageBlockDto } from './dto/store-front-page-blocks-settings.dto';
import { StoreFrontPageParamDto } from './dto/store-front-page-param.dto';
import { IPageSettingMetadata, IStoreFrontCollection } from './types/scheme';
import { StoreFrontPageBlockSetting } from './types/constants';
import { Document } from 'mongoose';
import { PaginatedRequestDto } from '../dto/paginated-request.dto';

@Injectable()
export class StoreFrontsService extends MongooseService {
    constructor(
        private readonly storeFrontDao: StoreFrontDao,
        private readonly cardsService: CardsService,
        private readonly collectionService: TokenCollectionsService
    ) {
        super();
    }

    protected get dao(): StoreFrontDao {
        return this.storeFrontDao;
    }

    async create(
        owner: string,
        logo: IS3File | null,
        createStoreFrontDto: CreateStoreFrontDto
    ): Promise<IStoreFrontDocument | null> {
        return this.storeFrontDao.create(
            owner,
            createStoreFrontDto.name,
            logo
        );
    }

    async addCards(id: string, cardsIds: string[]): Promise<void> {
        cardsIds = [...new Set(cardsIds)] as string[];
        await this.storeFrontDao.addCards(id, cardsIds.map(c => ({ cardId: c })));
    }

    async deleteCards(id: string, cardsIds: string[]): Promise<void> {
        await this.storeFrontDao.deleteCards(id, cardsIds);
    }

    async getBySlug(slug: string): Promise<IStoreFrontDocument | null> {
        if (!slug) {
            return null;
        }

        return this.storeFrontDao.getBySlug(slug);
    }

    async getStoreFrontById(
        id: string,
        release = false
    ): Promise<IStoreFrontDocument | IStoreFrontLeanDocument> {
        const storeFront = await this.getById<IStoreFrontDocument>(id);

        if (!release) {
            return storeFront;
        }

        return storeFront.release as IStoreFrontLeanDocument;
    }

    async getCards(id: string, query: StoreFrontGetCardsQueryDto): Promise<IPaginatedList<ICardDocument>> {
        const storeFront = await this.getStoreFrontById(id, query.release);

        let cardIds = [];
        storeFront.cards.forEach((c) => {
            if (!query.status) {
                cardIds.push(c.cardId.toString());
            }
            if (query.status === c.status) {
                cardIds.push(c.cardId.toString());
            }
        });

        if (query.cards?.length) {
            cardIds = cardIds.filter(id => query.cards.includes(id));
        }

        return this.cardsService.getCardsByIdAndQuery(cardIds, query, true, ['creator']);
    }


    async getCollections(
        id: string,
        query: StoreFrontGetCollectionsQueryDto
    ): Promise<IPaginatedList<IStoreFrontCollection>> {
        const storeFront = await this.getStoreFrontById(id, query.release);

        let collectionIds = [];
        storeFront.collections.forEach((c) => {
            if (!query.status) {
                collectionIds.push(c.collectionId.toString());
            }
            if (query.status === c.status) {
                collectionIds.push(c.collectionId.toString());
            }
        });

        if (query.collections?.length) {
            collectionIds = collectionIds.filter(id => query.collections.includes(id));
        }

        const res = await this.collectionService.getCollectionsListByIdsAndFilter(
            collectionIds,
            query.limit,
            query.offset,
            SortOrder.asc
        );

        const cards = await this.cardsService.getCardsByIdsAndCollectionIds(
            storeFront.cards.map(c => c.cardId.toString()),
            res.data.map(c => c.id),
            ['_id', 'tokenCollectionId']
        );

        return {
            ...res,
            data: res.data.map(collection => ({
                    ...collection.toObject(),
                    userCardsCount: cards.filter(c => c.tokenCollectionId.toString() === collection.id).length
                })
            )
        };
    }

    async updateCollectionsByCards(id: string, cardIds: string[]): Promise<void> {
        const storeFront = await this.getById<IStoreFrontDocument>(id);
        const existCollectionIds = storeFront.collections.map(
            (c) => c.collectionId.toString()
        );
        const existingCards = storeFront.cards as IStoreFrontCard[];
        const existingCardsIds = await this.cardsService.getCardsByIds(
            existingCards.map((c) => c.cardId.toString())
        );
        const processedCards = await this.cardsService.getCardsByIds(cardIds);

        const collectionsToUpdate = processedCards.map(
            (c) => c.tokenCollectionId.toString()
        );

        if (!existCollectionIds.length && collectionsToUpdate.length > 0) {
            await this.addCollections(id, collectionsToUpdate);
        }

        const newIds = collectionsToUpdate.filter(
            (c) => !existCollectionIds.includes(c)
        );

        if (newIds.length) {
            const newCollectionsIds = [...new Set(existCollectionIds.concat(newIds))] as string[];
            await this.addCollections(id, newCollectionsIds);
            return;
        }

        const removeIds = existCollectionIds
            .filter((c) => (
                collectionsToUpdate.includes(c)
                && !existingCardsIds.filter(
                (x) => x.tokenCollectionId.toString() === c
                ).length)
            );

        if (removeIds.length) {
            await this.deleteCollections(id, removeIds);
        }
    }

    async addCollections(id: string, collectionIds: string[]): Promise<void> {
        await this.storeFrontDao.addCollections(id, collectionIds.map(c => ({ collectionId: c })));
    }

    async deleteCollections(id: string, collectionIds: string[]): Promise<void> {
        await this.storeFrontDao.deleteCollections(id, collectionIds);
    }

    async updateSettings(
        id: string,
        logo: IS3File | null,
        settings: StoreFrontUpdateSettingsDto
    ): Promise<void> {
        await this.storeFrontDao.updateSettings(
            id,
            settings.name,
            settings.slug || null,
            settings.fee,
            settings.payoutAddress,
            settings.paymentTokens,
            logo
        );
    }

    async storePageSetting(
        storeFront: IStoreFrontDocument,
        { page }: StoreFrontPageParamDto,
        settings: StoreFrontPageBlockDto
    ): Promise<IStoreFrontDocument> {
        return this.dao.storePageSetting(
            storeFront.id,
            page,
            settings
        );
    }

    getPageSettingByStoreFront(
        storeFront: IStoreFrontDocument | IStoreFrontLeanDocument,
        pageName: string
    ): IStoreFrontPage | undefined {
        if (storeFront instanceof Document) {
            storeFront = storeFront.toObject();
        }

        return storeFront.pages.find(page => page.name === pageName);
    }

    getPageSettingsMetadata(): IPageSettingMetadata[] {
        return Object.entries(StoreFrontPageBlockSetting).map(([type, dto]) => new dto().metadata(type));
    }

    async publishStoreFront(storeFront: IStoreFrontDocument, slug?: string): Promise<void> {
        const { release, ...toRelease } = storeFront.toObject();

        await this.dao.publishStoreFront(
            storeFront.id,
            JSON.stringify(toRelease),
            slug || null
        );
    }

    async getStoreFrontsByUserId(
        userId: string,
        paginationQuery: PaginatedRequestDto
    ): Promise<IPaginatedList<IStoreFrontDocument>> {
        return this.dao.getStoreFrontsByUserId(userId, paginationQuery);
    }
}
