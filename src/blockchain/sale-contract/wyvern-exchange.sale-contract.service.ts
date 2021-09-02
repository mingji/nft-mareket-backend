import { BadRequestException } from '@nestjs/common';
import { SaleContractService } from '../sale-contract.service';
import { FeeMethod, HowToCall, SaleKind, Side } from '../types/wyvern-exchange/enums';
import { Errors } from '../types/wyvern-exchange/errors';
import { EIP } from '../../config/types/constants';
import { IPutOnSaleOrder, SmartContractType } from '../types/scheme';
import { Web3Service } from '../web3.service';

export abstract class WyvernExchangeSaleContractService implements SaleContractService {
    public abstract get web3Service(): Web3Service;

    public abstract get wyvernExchange(): SmartContractType;

    async getPutOnSaleHash(
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
        const takerEthAddress = '0x0000000000000000000000000000000000000000'; //TODO: STUB - taker eth address
        const staticTarget = '0x0000000000000000000000000000000000000000';
        const replacementPattern = '0x000000000000000000000000000000000000000000000000000000000000000000000000ff' +
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000' +
            '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
            '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
            '000000000000000000000';
        const callData = '0x';
        const callDataHex = this.web3Service.getEncodedSafeTransferFrom(
            eipVersion,
            ownerEthAddress,
            takerEthAddress,
            tokenIdentifier.toString(),
            callData,
            tokensCount.toString()
        );
        const order = [
            [
                saleContract,
                ownerEthAddress,
                takerEthAddress,
                marketPlaceFeeAddress,
                tokenContractId,
                staticTarget,
                currencyTokenAddress,
            ],
            [
                '0xfa', //TODO STUB - owner fee
                '0x0', //TODO STUB - taker fee
                '0x0', //TODO STUB - creator fee
                '0x0', //TODO STUB - fee ?
                this.web3Service.utils.toWei(tokenPrice, 'ether'),
                '0x0', //TODO STUB - minimum price at the auction
                Math.floor(publishFrom.getTime() / 1000),
                publishTo ? Math.floor(publishTo.getTime() / 1000) : '0x0',
                salt
            ],
            FeeMethod.splitFee,
            Side.sell,
            SaleKind.fixedPrice,
            HowToCall.call,
            callDataHex,
            replacementPattern,
            staticExtraData
        ];

        try {
            return {
                order,
                orderHash: await this.wyvernExchange.methods.hashToSign_(...order).call({ from: ownerEthAddress })
            };
        } catch (e) {
            throw new BadRequestException(Errors.WRONG_SIGNED_DATA);
        }
    }
}
