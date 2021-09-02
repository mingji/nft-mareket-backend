import { Network } from '../../../config/types/constants';
import { SmartContractType } from '../scheme';
import { WyvernExchangeSaleContractService } from '../../sale-contract/wyvern-exchange.sale-contract.service';

export interface IWyvernExchange {
    [Network.ETHEREUM]: SmartContractType,
    [Network.MATIC]: SmartContractType,
}

export type WyvernExchangeType = keyof IWyvernExchange;

export interface ISaleContractServices {
    [Network.ETHEREUM]: WyvernExchangeSaleContractService,
    [Network.MATIC]: WyvernExchangeSaleContractService,
}
