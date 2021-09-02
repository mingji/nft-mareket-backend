import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { ICardDocument } from '../../cards/schemas/cards.schema';

export interface ISearchRes {
    collections: ITokenCollectionDocument[];
    cards: ICardDocument[];
}