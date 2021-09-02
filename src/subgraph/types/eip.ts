import { EIP, Network } from '../../config/types/constants';

export interface  IEipAttribute {
    trait_type: string;
    value: string;
}

export interface IEipMetadata {
    description: string;
    image: string;
    animation_url?: string;
    name: string;
    attributes: IEipAttribute[];
}

export interface IEip1155Account {
    id: string;
}

export interface IEip1155TokenBalance {
    id: string;
    account: IEip1155Account;
    value: string;
    transfersFrom?: IEip1155Transfer[];
    transfersTo?: IEip1155Transfer[];
}

export interface IEip1155Transfer {
    from: IEip1155Account;
    to: IEip1155Account;
    value: string;
}

export interface IEip1155Token {
    id: string;
    URI: string;
    identifier: string;
    totalSupply: string;
    balances?: IEip1155TokenBalance[];
    approvals?: IEip1155Transfer[];
}

export interface IEipToken {
    token: string;
    URI: string;
    identifier: string;
    totalSupply: string;
    eipVersion: EIP;
    network: Network;
    balances?: IEip1155TokenBalance[]; //TODO: convert 1155 to common balances
    metadata?: IEipMetadata;
}

export enum EipPagination {
    tokenRegistriesLimit = 1000,
    tokenBalancesLimit = 1000,
    sellLimit = 1000,
    createdCollectionsLimit = 1000,
    createdTokensLimit = 1000,
    burnedTokensLimit = 1000,
    transferTokensLimit = 1000,
}

export interface ISubgraphTokenRegistries {
    tokenRegistries: ISubgraphRegistry[];
}

export interface ISubgraphRegistry {
    id: string;
    tokens: ISubgraphTokenRegistry[];
}

export interface ISubgraphTokenRegistry {
    id: string;
    identifier: string;
    totalSupply: string;
    URI: string;
}

export interface ISubgraphTokenBalances {
    balances: IEip1155TokenBalance[];
}

export interface ISubgraphLatestBlockNumber {
    _meta: {
        block: {
            number: number
        }
    };
}

export interface ISubgraphSell {
    blockNumber: string;
    buyHash: string;
    sellHash: string;
    maker: IEip1155Account;
    taker: IEip1155Account;
}

export interface ISubgraphSellData {
    sells: ISubgraphSell[];
}

export interface ISubgraphCreatedCollection {
    creator: IEip1155Account;
    collectionAddress: string;
    name: string;
    uri: string;
}

export interface ISubgraphCreatedCollectionsData {
    createdCollections: ISubgraphCreatedCollection[];
}

export interface ISubgraphTokensData {
    tokens: ISubgraphToken[];
}

export interface ISubgraphToken {
    contract: string;
    identifier: string;
    value: string;
    uri?: string;
    creator?: IEip1155Account;
    user?: IEip1155Account;
    from?: IEip1155Account;
    to?: IEip1155Account;
}

export interface ISubgraphParsedToken {
    contract: string;
    identifier: number;
    value: number;
    uri?: string;
    creator?: IEip1155Account;
    user?: IEip1155Account;
    from?: IEip1155Account;
    to?: IEip1155Account;
}
