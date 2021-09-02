import { ICardDocument, ICardLeanDocument, IPropertyCard } from '../schemas/cards.schema';
import { Reaction, SortOrder } from '../../types/constants';
import { Dao } from '../../dao/dao';
import { IOwnerCardsInCollection } from '../types/scheme';
import { PopulateOptions } from 'mongoose';

export interface IGetCardsQuery {
    collections?: string[],
    property?: IPropertyCard,
    categories?: string[],
    sale?: boolean,
    sortField?: CardSortField,
    sortOrder?: SortOrder,
    createdBy?: string,
    offset?: number,
    limit?: number,
    search?: string,
    likedBy?: string,
}

export enum CardSortField {
    id = '_id',
    price = 'price',
    viewersCount = 'viewersCount',
}

export abstract class CardDao extends Dao {
    public abstract getCards(
        query: IGetCardsQuery,
        lean?: boolean,
        ids?: string[],
        userId?: string,
        relations?: Array<string | PopulateOptions>
    ): Promise<ICardDocument[]>;

    public abstract getCardsCount(query: IGetCardsQuery, ids?: string[], userId?: string): Promise<number>;

    public abstract syncCard(tokenId: string, card: Partial<ICardLeanDocument>): Promise<void>;

    public abstract getUnusedCardsByCollection(
        tokenCollectionId: string,
        excludeTokenIds: string[]
    ): Promise<ICardLeanDocument[]>;

    public abstract deleteCardsByIds(ids: string[]): Promise<void>;

    public abstract getCardsByIds(ids: string[]): Promise<ICardDocument[]>;

    public abstract changeOwnerships(
        card: string | ICardDocument,
        tokensCount: number,
        makerId: string,
        takerId: string,
        takerEthAddress: string
    ): Promise<void>;

    public abstract increaseViewersCount(cardId: string): Promise<void>;

    public abstract updateCardHasSale(cardId: string, hasSale: boolean): Promise<void>;

    public abstract createCards(cards: ICardLeanDocument[]): Promise<void>;

    public abstract getCardsByIdsAndCollectionIds(
        ids: string[],
        collectionIds: string[],
        projection?: string[]
    ): Promise<ICardLeanDocument[]>;

    public abstract getOwnerCardsCountByCollectionsIds(
        tokenCollectionIds: string[],
        userId: string
    ): Promise<IOwnerCardsInCollection[]>;

    public abstract findCardByTokenCollectionIdAndIdentifier(
        tokenCollectionId: string,
        identifier: number
    ): Promise<ICardDocument>;

    public abstract burnCard(
        tokenCollectionId: string,
        identifier: number,
        ownerId: string,
        amount: number
    ): Promise<string | null>;

    public abstract toggleLikeOrDislike(userId: string, cardId: string, reaction: Reaction): Promise<void>;
}
