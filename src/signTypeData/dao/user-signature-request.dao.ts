import {
    IUserSignatureRequestDocument,
    IUserSignatureRequestLeanDocument
} from '../schemas/user-signature-request.schema';
import { Dao } from '../../dao/dao';
import { IEncryptedData } from '../../types/scheme';
import { WalletType } from '../types/sign-scheme';

export abstract class UserSignatureRequestDao extends Dao {
    public abstract storeUserSignatureRequest(
        walletType: WalletType,
        requestId: string,
        expireAt: Date,
        message: IEncryptedData
    ): Promise<IUserSignatureRequestDocument | null>;

    public abstract findActualSignatureByRequestId(
        requestId: string,
        lean
    ): Promise<IUserSignatureRequestLeanDocument | IUserSignatureRequestDocument | null>;
}
