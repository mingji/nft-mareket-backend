import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as wyvernExchangeAbi from '../../abi/wyvern-exchange.json';
import { SmartContractType } from '../../types/scheme';
import { Network } from '../../../config/types/constants';
import { IBlockchainConfig } from '../../../config';
import { WyvernExchangeSaleContractService } from '../wyvern-exchange.sale-contract.service';
import { MaticWeb3Service } from '../../web3/matic.web3.service';

@Injectable()
export class MaticWyvernExchangeSaleContractService extends WyvernExchangeSaleContractService {
    private _wyvernExchange = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly maticWeb3Service: MaticWeb3Service
    ) {
        super();
    }

    get wyvernExchange(): SmartContractType {
        if (!this._wyvernExchange) {
            const { [Network.MATIC]: { saleContract } } = this.configService.get<IBlockchainConfig>('blockchain');
            this._wyvernExchange = new this.maticWeb3Service.web3.eth.Contract(
                wyvernExchangeAbi,
                saleContract
            );
        }

        return this._wyvernExchange;
    }

    get web3Service(): MaticWeb3Service {
        return this.maticWeb3Service;
    }
}
