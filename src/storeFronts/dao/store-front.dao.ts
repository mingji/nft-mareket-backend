import { Dao } from '../../dao/dao';
import { IStoreFrontCollection, IStoreFrontDocument } from '../schemas/store-fronts.schema';
import { IS3File } from '../../types/scheme';
import { ICardsInstance } from '../types/scheme';
import { StoreFrontPageBlockDto } from '../dto/store-front-page-blocks-settings.dto';
import { PaginatedRequestDto } from '../../dto/paginated-request.dto';
import { IPaginatedList } from '../../types/common';

export abstract class StoreFrontDao extends Dao {
    public abstract create(owner: string, name: string, logo: IS3File): Promise<IStoreFrontDocument | null>;

    public abstract getBySlug(slug: string): Promise<IStoreFrontDocument | null>;

    public abstract addCards(id: string, cards: ICardsInstance[]): Promise<void>;

    public abstract deleteCards(id: string, cardsIds: string[]): Promise<void>;

    public abstract addCollections(id: string, collections: IStoreFrontCollection[]): Promise<void>;

    public abstract deleteCollections(id: string, collectionIds: string[]): Promise<void>;

    public abstract updateSettings(
        id: string,
        name?: string,
        slug?: string,
        fee?: number,
        payoutAddress?: string,
        paymentTokens?: string[],
        logo?: IS3File
    ): Promise<void>;

    public abstract storePageSetting(
        storeFrontId: string,
        page: string,
        settings: StoreFrontPageBlockDto
    ): Promise<IStoreFrontDocument>;

    public abstract publishStoreFront(id: string, release: string, slug?: string): Promise<void>;

    public abstract existCollectionsInStoreFront(id: string, collectionIds: string[]): Promise<boolean>;

    public abstract existCardsInStoreFront(id: string, cardIds: string[]): Promise<boolean>;

    public abstract getStoreFrontsByUserId(
        userId: string,
        paginationQuery: PaginatedRequestDto
    ): Promise<IPaginatedList<IStoreFrontDocument>>;
}
