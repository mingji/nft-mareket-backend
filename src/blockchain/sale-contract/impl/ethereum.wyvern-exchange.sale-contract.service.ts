import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as wyvernExchangeAbi from '../../abi/wyvern-exchange.json';
import { WyvernExchangeSaleContractService } from '../wyvern-exchange.sale-contract.service';
import { IBlockchainConfig } from '../../../config';
import { Network } from '../../../config/types/constants';
import { SmartContractType } from '../../types/scheme';
import { EthereumWeb3Service } from '../../web3/ethereum.web3.service';

@Injectable()
export class EthereumWyvernExchangeSaleContractService extends WyvernExchangeSaleContractService {
    private _wyvernExchange = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumWeb3Service: EthereumWeb3Service
    ) {
        super();
    }

    get wyvernExchange(): SmartContractType {
        if (!this._wyvernExchange) {
            const { [Network.ETHEREUM]: { saleContract } } = this.configService.get<IBlockchainConfig>('blockchain');
            this._wyvernExchange = new this.ethereumWeb3Service.web3.eth.Contract(
                wyvernExchangeAbi,
                saleContract
            );
        }

        return this._wyvernExchange;
    }

    get web3Service(): EthereumWeb3Service {
        return this.ethereumWeb3Service;
    }
}
