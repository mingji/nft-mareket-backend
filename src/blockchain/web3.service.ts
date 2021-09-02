import { AbiItem, Utils } from 'web3-utils';
import { EIP } from '../config/types/constants';
import abiFunctions from './abi/functions';

export abstract class Web3Service {
    public abstract get web3();

    get utils(): Utils {
        return this.web3.utils;
    }

    getEncodedSafeTransferFrom(
        eipVersion: EIP,
        from: string,
        to: string,
        tokenId: string,
        data: string,
        amount: string
    ): string {
        const params = [
            from,
            to,
            tokenId,
            eipVersion === EIP.EIP_1155 ? amount : null,
            data
        ].filter(Boolean);

        return this.web3.eth.abi.encodeFunctionCall(
            abiFunctions[eipVersion].safeTransferFrom as AbiItem,
            params
        );
    }
}
