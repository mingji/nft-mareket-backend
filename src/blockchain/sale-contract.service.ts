import { EIP } from '../config/types/constants';
import { IPutOnSaleOrder } from './types/scheme';

export abstract class SaleContractService {
    public abstract getPutOnSaleHash(
        saleContract: string,
        marketPlaceFeeAddress: string,
        eipVersion: EIP,
        ownerEthAddress: string,
        tokenContractId: string,
        tokenIdentifier: number,
        tokensCount: number,
        tokenPrice: string,
        timeFrom: Date,
        timeTo: Date,
        salt: string,
        currencyTokenAddress: string,
        staticExtraData: string
    ): Promise<IPutOnSaleOrder>;
}
