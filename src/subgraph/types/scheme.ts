import { ISubgraphCreatedCollection, ISubgraphParsedToken, ISubgraphSell } from './eip';

export interface ISellData {
    [key: string]: ISubgraphSell;
}

export interface ICreatedCollectionData {
    [key: string]: ISubgraphCreatedCollection;
}

export interface ITokensData {
    [key: string]: ISubgraphParsedToken[];
}
