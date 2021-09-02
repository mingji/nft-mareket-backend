import { Injectable } from '@nestjs/common';
import { EthereumWyvernExchangeSaleContractService } from './sale-contract/impl/ethereum.wyvern-exchange.sale-contract.service';
import { MaticWyvernExchangeSaleContractService } from './sale-contract/impl/matic.wyvern-exchange.sale-contract.service';
import { EIP, Network } from '../config/types/constants';
import { ISaleContractServices, WyvernExchangeType } from './types/wyvern-exchange/scheme';
import { IPutOnSaleOrder } from './types/scheme';

@Injectable()
export class BlockchainService {
    private saleContractServices: ISaleContractServices = {
        [Network.ETHEREUM]: null,
        [Network.MATIC]: null,
    };

    constructor(
        private readonly ethereumWyvernExchangeSaleContractService: EthereumWyvernExchangeSaleContractService,
        private readonly maticWyvernExchangeSaleContractService: MaticWyvernExchangeSaleContractService
    ) {
        this.saleContractServices[Network.ETHEREUM] = this.ethereumWyvernExchangeSaleContractService;
        this.saleContractServices[Network.MATIC] = this.maticWyvernExchangeSaleContractService;
    }

    async getCardPutOnSaleHash(
        wyvernExchangeType: WyvernExchangeType,
        saleContract: string,
        marketPlaceFeeAddress: string,
        eipVersion: EIP,
        ownerEthAddress: string,
        tokenContractId: string,
        tokenIdentifier: number,
        tokensCount: number,
        tokenPrice: string,
        publishFrom: Date,
        publishTo: Date,
        salt: string,
        currencyTokenAddress: string,
        staticExtraData = '0x'
    ): Promise<IPutOnSaleOrder> {
        return this.saleContractServices[wyvernExchangeType].getPutOnSaleHash(
            saleContract,
            marketPlaceFeeAddress,
            eipVersion,
            ownerEthAddress,
            tokenContractId,
            tokenIdentifier,
            tokensCount,
            tokenPrice,
            publishFrom,
            publishTo,
            salt,
            currencyTokenAddress,
            staticExtraData
        );
    }
}
