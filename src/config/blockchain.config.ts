import { registerAs } from '@nestjs/config';
import { Network } from './types/constants';
import { JobType } from '../jobs/types/enums';

export interface IBlockNumber {
    [JobType.saleListener]: number;
    [JobType.createdContractListener]: number;
    [JobType.createdTokenListener]: number;
    [JobType.burnedTokenListener]: number;
    [JobType.transferTokenListener]: number;
    [JobType.launchpadSaleListener]: number;
}

export interface IAllowedCurrency {
    symbol: string;
    tokenAddress: string;
}

export interface IBlockchainNetworkConfig {
    web3HttpProvider: string;
    saleContractProxy: string;
    saleContract: string;
    subgraphPath: string;
    allowedCryptocurrencies: IAllowedCurrency[];
    startBlock: IBlockNumber;
}

export interface IBlockchainConfig {
    metadataUriDomain: string;
    marketPlaceFeeAddress: string;
    marketPlacePrivateKey: string;
    [Network.ETHEREUM]: IBlockchainNetworkConfig;
    [Network.MATIC]: IBlockchainNetworkConfig;
}

export const blockchainConfig = registerAs('blockchain', () => ({
    metadataUriDomain: process.env.METADATA_URI_DOMAIN || '',
    marketPlaceFeeAddress: process.env.MARKET_PLACE_FEE_ADDRESS || '',
    marketPlacePrivateKey: process.env.MARKET_PLACE_PRIVATE_KEY || '',
    [Network.ETHEREUM]: {
        web3HttpProvider: process.env.ETHEREUM_WEB3_HTTP_PROVIDER || '',
        saleContractProxy: (process.env.ETHEREUM_SALE_CONTRACT_PROXY || '').toLowerCase(),
        saleContract: (process.env.ETHEREUM_SALE_CONTRACT || '').toLowerCase(),
        allowedCryptocurrencies: JSON.parse(process.env.ETHEREUM_ALLOWED_CRYPTOCURRENCIES || '') || [],
        subgraphPath: process.env.ETHEREUM_SUBGRAPH_PATH || '',
        startBlock: {
            [JobType.saleListener]: parseInt(process.env.ETHEREUM_SALE_START_BLOCK_NUMBER, 10) || 0,
            [JobType.createdContractListener]: parseInt(
                process.env.ETHEREUM_CREATED_CONTRACT_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.createdTokenListener]: parseInt(
                process.env.ETHEREUM_CREATED_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.burnedTokenListener]: parseInt(
                process.env.ETHEREUM_BURNED_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.transferTokenListener]: parseInt(
                process.env.ETHEREUM_TRANSFER_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.launchpadSaleListener]: parseInt(
                process.env.ETHEREUM_LAUNCHPAD_SALE_START_BLOCK_NUMBER,
                10
            ) || 0,
        }
    },
    [Network.MATIC]: {
        web3HttpProvider: process.env.MATIC_WEB3_HTTP_PROVIDER || '',
        saleContractProxy: (process.env.MATIC_SALE_CONTRACT_PROXY || '').toLowerCase(),
        saleContract: (process.env.MATIC_SALE_CONTRACT || '').toLowerCase(),
        allowedCryptocurrencies: JSON.parse(process.env.MATIC_ALLOWED_CRYPTOCURRENCIES || '') || [],
        subgraphPath: process.env.MATIC_SUBGRAPH_PATH || '',
        startBlock: {
            [JobType.saleListener]: parseInt(process.env.MATIC_SALE_START_BLOCK_NUMBER, 10) || 0,
            [JobType.createdContractListener]: parseInt(
                process.env.MATIC_CREATED_CONTRACT_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.createdTokenListener]: parseInt(
                process.env.MATIC_CREATED_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.burnedTokenListener]: parseInt(
                process.env.MATIC_BURNED_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.transferTokenListener]: parseInt(
                process.env.MATIC_TRANSFER_TOKEN_START_BLOCK_NUMBER,
                10
            ) || 0,
            [JobType.launchpadSaleListener]: parseInt(
                process.env.MATIC_LAUNCHPAD_SALE_START_BLOCK_NUMBER,
                10
            ) || 0,
        }
    },
}));

export const getSubgraphPath = (network: Network) => blockchainConfig()[network].subgraphPath;