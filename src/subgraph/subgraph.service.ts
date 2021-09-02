import { Injectable } from '@nestjs/common';
import { request } from 'graphql-request';
import { MetadataService } from './metadata.service';
import { UtilsService } from '../utils/utils.service';
import {
    EipPagination,
    IEip1155Token,
    IEip1155TokenBalance,
    IEipToken,
    ISubgraphCreatedCollectionsData,
    ISubgraphLatestBlockNumber,
    ISubgraphSellData,
    ISubgraphTokenBalances,
    ISubgraphTokenRegistries,
    ISubgraphTokensData
} from './types/eip';
import { ConfigService } from '@nestjs/config';
import { getSubgraphPath } from '../config';
import { EIP, Network } from '../config/types/constants';
import {
    getBurnedTokensQuery,
    getCreatedCollectionsQuery,
    getCreatedTokensQuery,
    getLatestBlockNumberQuery,
    getSellDataQuery,
    getTokenBalancesQuery,
    getTokenRegistriesQuery,
    getTransferTokensQuery
} from './queries';
import { ICreatedCollectionData, ISellData, ITokensData } from './types/scheme';
import { SubgraphError } from './errors/subgraph.error';
import { Errors } from './types/errors';

@Injectable()
export class SubgraphService {
    constructor (
        private metadataService: MetadataService,
        private utilsService: UtilsService,
        private configService: ConfigService
    ) {}

    async getCollectiblesFetch(
        network: Network,
        eipVersion: EIP,
        contactAddress: string,
        offset?: number,
        limit?: number
    ): Promise<ISubgraphTokenRegistries> {
        return request(
            getSubgraphPath(network),
            getTokenRegistriesQuery(eipVersion)(contactAddress, offset, limit)
        );
    };

    async getTokenWithMetadataListFetch(
        network: Network,
        eipVersion: EIP,
        contactAddress: string
    ): Promise<IEipToken[]> {
        const tokensList = [];
        let offset = 0;
        let result = await this.getCollectiblesFetch(network, eipVersion, contactAddress, offset);

        while (result.tokenRegistries.length) {
            const tokens = this.collectTokens(result, eipVersion, network);

            await Promise.all(tokens.map(async token => {
                let metadata = null;
                if (this.utilsService.isValidURI(token.URI)) {
                    metadata = await this.metadataService.fetchMetadata(eipVersion, token.URI);
                }
                tokensList.push({ ...token, metadata });
            }));

            offset += EipPagination.tokenRegistriesLimit;
            result = await this.getCollectiblesFetch(network, eipVersion, contactAddress, offset);
        }

        return tokensList;
    }

    async getBalancesByToken(
        token: IEipToken,
        offset?: number,
        limit?: number
    ): Promise<ISubgraphTokenBalances> {
        return request(
            getSubgraphPath(token.network),
            getTokenBalancesQuery(token.eipVersion, token.token, offset, limit)
        );
    }

    async getAllBalancesByToken(token: IEipToken): Promise<IEip1155TokenBalance[]> {
        let balances = [];
        let offset = 0;
        let res = await this.getBalancesByToken(token, offset);

        while (res.balances.length) {
            balances = balances.concat(res.balances);
            offset += EipPagination.tokenBalancesLimit;
            res = await this.getBalancesByToken(token, offset);
        }

        return balances;
    }

    private collectTokens(result: any, eipVersion: EIP, network: Network): IEipToken[] {
        const tokens = [];
        switch (eipVersion) {
            case EIP.EIP_1155:
                result.tokenRegistries.forEach((register) => {
                    register.tokens.forEach((token: IEip1155Token) => {
                        tokens.push({
                            token: token.id,
                            URI: token.URI,
                            identifier: token.identifier,
                            totalSupply: token.totalSupply,
                            eipVersion,
                            network
                        })
                    })
                });
                break;
            case EIP.EIP_721:
                result.tokenContracts.forEach((contract) => {
                    //TODO: Process 721 identifier, add interface for token 721
                    contract.tokens.forEach((token: { tokenURI: string, id: string }) => {
                        tokens.push({
                            token: token.id,
                            URI: token.tokenURI,
                            identifier: null, //TODO: stub
                            totalSupply: 1
                        });
                    });
                });
                break;
        }
        return tokens;
    }

    async getLatestBlockNumber(network: Network): Promise<number> {
        const { _meta: { block: { number } } } = await request(
            getSubgraphPath(network),
            getLatestBlockNumberQuery()
        ) as ISubgraphLatestBlockNumber;

        return number;
    }

    async getSellData(
        network: Network,
        contractAddress: string,
        blockNumber: number,
        offset?: number,
        limit?: number
    ): Promise<ISellData> {
        const { sells } = await request(
            getSubgraphPath(network),
            getSellDataQuery(contractAddress, blockNumber, offset, limit)
        ) as ISubgraphSellData;

        if (!sells.length) {
            return null;
        }

        const data = {};
        sells.forEach(sell => data[sell.sellHash] = sell);

        return data;
    }

    async getAllSellData(
        network: Network,
        contractAddress: string,
        blockNumber: number
    ): Promise<ISellData> {
        const data: ISellData = {};
        let offset = 0;
        let res = await this.getSellData(network, contractAddress, blockNumber, offset);

        while (res && Object.keys(res).length) {
            Object.assign(data, res);
            offset += EipPagination.sellLimit;
            res = await this.getSellData(network, contractAddress, blockNumber, offset);
        }

        return data;
    }

    async getCreatedCollections(network: Network, blockNumber: number): Promise<ICreatedCollectionData> {
        const getData = async (
            blockNumber: number,
            offset?: number,
            limit?: number
        ): Promise<ICreatedCollectionData | null> => {
            const { createdCollections } = await request(
                getSubgraphPath(network),
                getCreatedCollectionsQuery(blockNumber, offset, limit)
            ) as ISubgraphCreatedCollectionsData;

            if (!createdCollections.length) {
                return null;
            }

            const data = {};
            createdCollections.forEach(contact => {
                data[contact.collectionAddress] = contact;
            });

            return data;
        };

        const data: ICreatedCollectionData = {};
        let offset = 0;
        let res = await getData(blockNumber, offset);

        while (res && Object.keys(res).length) {
            Object.assign(data, res);
            offset += EipPagination.createdCollectionsLimit;
            res = await getData(blockNumber, offset);
        }

        return data;
    }

    async getCreatedTokens(network: Network, blockNumber: number): Promise<ITokensData> {
        return this.getTokensDataByBlock(
            network,
            blockNumber,
            getCreatedTokensQuery,
            EipPagination.createdTokensLimit
        );
    }

    async getBurnedTokens(network: Network, blockNumber: number): Promise<ITokensData> {
        return this.getTokensDataByBlock(
            network,
            blockNumber,
            getBurnedTokensQuery,
            EipPagination.burnedTokensLimit
        );
    }

    async getTransferTokens(network: Network, blockNumber: number): Promise<ITokensData> {
        return this.getTokensDataByBlock(
            network,
            blockNumber,
            getTransferTokensQuery,
            EipPagination.transferTokensLimit
        );
    }

    private async getTokensDataByBlock(
        network: Network,
        blockNumber: number,
        getQuery: (
            blockNumber: number,
            offset: number,
            limit: number
        ) => string,
        limit: EipPagination
    ): Promise<ITokensData> {
        const data: ITokensData = {};
        let offset = 0;
        let res = await this.getTokensData(
            network,
            getQuery.bind(this, blockNumber, offset)
        );

        while (res && Object.keys(res).length) {
            for (const contract in res) {
                if (res.hasOwnProperty(contract)) {
                    data[contract] = (data[contract] || []).concat(res[contract]);
                }
            }
            offset += limit;
            res = await this.getTokensData(
                network,
                getQuery.bind(this, blockNumber, offset)
            );
        }

        return data;
    }

    private async getTokensData(
        network: Network,
        getQuery: () => string
    ): Promise<ITokensData | null> {
        const { tokens } = await request(
            getSubgraphPath(network),
            getQuery()
        ) as ISubgraphTokensData;

        if (typeof tokens === 'undefined') {
            throw new SubgraphError(Errors.CAN_NOT_FETCH_TOKENS);
        }

        if (!tokens.length) {
            return null;
        }

        const data: ITokensData = {};
        tokens.forEach(token => {
            if (!data[token.contract]) {
                data[token.contract] = [];
            }

            const { value, identifier, ...rest } = token;

            data[token.contract].push({
                ...rest,
                identifier: parseInt(identifier, 10),
                value: parseInt(value, 10),
            });
        });

        return data;
    }

    async getLaunchpadSaleData(network: Network, blockNumber: number): Promise<any> {
        //TODO: implement gql query
    }
}