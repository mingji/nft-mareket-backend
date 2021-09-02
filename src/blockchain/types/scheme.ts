import { Contract } from 'web3-eth-contract';

export interface IPutOnSaleOrder {
    order: any[],
    orderHash: string
}

export type SmartContractType = Contract;
