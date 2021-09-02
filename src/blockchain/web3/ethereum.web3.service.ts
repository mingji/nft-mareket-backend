import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Web3 from 'web3';
import { IBlockchainConfig } from '../../config';
import { Network } from '../../config/types/constants';
import { Web3Service } from '../web3.service';

@Injectable()
export class EthereumWeb3Service extends Web3Service {
    private _web3 = null;

    constructor(private readonly configService: ConfigService) {
        super();
    }

    get web3() {
        if (!this._web3) {
            const {
                [Network.ETHEREUM]: { web3HttpProvider }
            } = this.configService.get<IBlockchainConfig>('blockchain');
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this._web3 = new Web3(new Web3.providers.HttpProvider(web3HttpProvider));
        }

        return this._web3;
    }
}
