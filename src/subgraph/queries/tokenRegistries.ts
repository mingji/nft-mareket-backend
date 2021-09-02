import { gql } from 'graphql-request';
import { EipPagination } from '../types/eip';
import { EIP } from '../../config/types/constants';
 
export const getTokenRegistriesQuery = (eipVersion: EIP) => (
    contactAddress,
    offset = 0,
    limit = EipPagination.tokenRegistriesLimit
): string => {
    switch(eipVersion) {
        case EIP.EIP_1155:
            return gql`
                {
                    tokenRegistries (first: ${limit}, skip: ${offset}, where: { id: "${contactAddress}" }) {
                        id
                        tokens {
                            id
                            identifier
                            totalSupply
                            URI
                        }
                    }
                }
            `;
        case EIP.EIP_721:
            return gql`
                {
                    tokenContracts(where: { id: "${contactAddress}" }) {
                        id
                        name
                        supportsEIP721Metadata
                        tokens {
                            id
                            tokenURI
                        }
                    }
                }
            `;
        default:
            throw new Error('getTokenRegistriesQuery: wrong eip version');
    }
};

export const getTokenBalancesQuery = (
    eipVersion: EIP,
    tokenId,
    offset = 0,
    limit = EipPagination.tokenBalancesLimit
): string => {
    switch(eipVersion) {
        case EIP.EIP_1155:
            return gql`
                {
                    balances (first: ${limit}, skip: ${offset}, where: { token_in: ["${tokenId}"], value_gt: 0 }) {
                        id
                        account {
                            id
                        }
                        value
                    }
                }
            `;
        case EIP.EIP_721:
            return gql`
                {
                    
                }
            `;
        default:
            throw new Error('getTokenRegistriesQuery: wrong eip version');
    }
};