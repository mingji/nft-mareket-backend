import { ITokenCollectionLeanDocument } from '../schemas/token-collection.schema';

export interface ICollection extends ITokenCollectionLeanDocument {
    userCardsCount: number;
}