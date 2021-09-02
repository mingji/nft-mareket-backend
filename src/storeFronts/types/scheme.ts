import {
    CollectiblesChooseType, CollectiblesSortType,
    StoreFrontCardStatus,
    StoreFrontPage,
    StoreFrontPageBlock
} from './enums';
import { ITokenCollectionLeanDocument } from '../../tokenCollections/schemas/token-collection.schema';

export interface ICardsInstance {
    cardId: string;
    status?: StoreFrontCardStatus
}

export interface IPageBlockSettings {
    type: StoreFrontPageBlock;
}

export interface IPageBlockHeaderSettings extends IPageBlockSettings {
    texts: {
        name: string,
        headline: string
    };
    collectibles: {
        choose: CollectiblesChooseType,
        collections: string[],
        itemsType: StoreFrontCardStatus,
        sort: CollectiblesSortType
    };
}

export interface IPageBlock {
    page: StoreFrontPage;
    storeFrontId: string;
    settings: IPageBlockSettings
}

export interface IPageSettingMetadata {
    type: string;
    settings: any;
}

export interface IStoreFrontCollection extends ITokenCollectionLeanDocument {
    userCardsCount: number;
}
