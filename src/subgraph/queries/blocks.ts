import { gql } from 'graphql-request';
import { EipPagination } from '../types/eip';

export const getLatestBlockNumberQuery = (): string => {
    return gql`
        {
            _meta {
                block {
                    number
                }
            }
        }
    `;
};

export const getSellDataQuery = (
    contractId: string,
    blockNumber: number,
    offset = 0,
    limit = EipPagination.sellLimit
): string => {
    return gql`
        {
            sells (
                first: ${limit}, skip: ${offset}, where: { blockNumber: ${blockNumber}, contract: "${contractId}" }
            ) {
                contract
                blockNumber
                buyHash
                sellHash
                maker {
                    id
                }
                taker {
                    id
                }
            }
        }
    `;
};

export const getCreatedCollectionsQuery = (
    blockNumber: number,
    offset = 0,
    limit = EipPagination.createdCollectionsLimit
): string => {
    return gql`
        {
            createdCollections (first: ${limit}, skip: ${offset}, where: { blockNumber: ${blockNumber} }) {
                creator {
                  id
                }
                collectionAddress
                name
                uri
            }
        }
    `;
};

export const getCreatedTokensQuery = (
    blockNumber: number,
    offset = 0,
    limit = EipPagination.createdTokensLimit
): string => {
    return gql`
        {
            tokens: createdTokens (first: ${limit}, skip: ${offset}, where: { blockNumber: ${blockNumber} }) {
                contract
                identifier
                value
                uri
                creator {
                  id
                }
            }
        }
    `;
};

export const getBurnedTokensQuery = (
    blockNumber: number,
    offset = 0,
    limit = EipPagination.burnedTokensLimit
): string => {
    return gql`
        {
            tokens: burnedTokens (first: ${limit}, skip: ${offset}, where: { blockNumber: ${blockNumber} }) {
                user {
                  id
                }
                identifier
                contract
                value
            }
        }
    `;
};

export const getTransferTokensQuery = (
    blockNumber: number,
    offset = 0,
    limit = EipPagination.transferTokensLimit
): string => {
    return gql`
        {
            tokens: transferTokens (first: ${limit}, skip: ${offset}, where: { blockNumber: ${blockNumber} }) {
                contract
                identifier
                value    
                from {
                  id
                }
                to {
                  id
                }
            }
        }
    `;
};
