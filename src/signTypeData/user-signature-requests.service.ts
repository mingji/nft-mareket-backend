import { Injectable } from '@nestjs/common';
import * as metamaskSignature from './messages/metamask-signature.json';
import * as arkaneSignature from './messages/arkane-signature.json';
import { v4 as uuidv4 } from 'uuid';
import { CryptService } from '../crypt/crypt.service';
import {
    IUserSignatureRequestDocument,
    IUserSignatureRequestLeanDocument,
} from './schemas/user-signature-request.schema';
import { ConfigService } from '@nestjs/config';
import { IAuthConfig } from '../config';
import { SignTypeDataMetamask_v3Dto } from './dto/sign-type-data-metamask_v3.dto';
import { SignTypeDataArkane_v3Dto } from './dto/sign-type-data-arkane_v3.dto';
import { UserSignatureRequestDao } from './dao/user-signature-request.dao';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { SignTypeDataError } from './errors/sign-type-data.error';
import { Errors } from './types/errors';
import { plainToClass } from 'class-transformer';
import { SignatureReqIdField, WalletType } from './types/sign-scheme';

@Injectable()
export class UserSignatureRequestsService extends MongooseService {
    constructor(
        private readonly userSignatureRequestDao: UserSignatureRequestDao,
        private readonly cryptService: CryptService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    protected get dao(): UserSignatureRequestDao {
        return this.userSignatureRequestDao;
    }

    getSignature(walletType: WalletType): SignTypeDataMetamask_v3Dto | SignTypeDataArkane_v3Dto {
        switch (walletType) {
            case WalletType.Metamask:
                return plainToClass(SignTypeDataMetamask_v3Dto, metamaskSignature);
            case WalletType.Arkane:
                return plainToClass(SignTypeDataArkane_v3Dto, arkaneSignature);
        }

        throw new SignTypeDataError(Errors.CAN_NOT_GET_SIGNATURE);
    }

    getReqId(): string {
        return uuidv4();
    }

    prepareSignature(
        walletType: WalletType,
        sign: SignTypeDataMetamask_v3Dto | SignTypeDataArkane_v3Dto
    ): void {
        sign.domain[SignatureReqIdField[walletType]] = this.getReqId();
    }

    async requestSignature(
        walletType: WalletType
    ): Promise<SignTypeDataMetamask_v3Dto | SignTypeDataArkane_v3Dto> {
        const sign = this.getSignature(walletType);
        this.prepareSignature(walletType, sign);

        const { signatureExpiresIn } = this.configService.get<IAuthConfig>('auth');
        const expireAt = new Date(new Date().getTime() + signatureExpiresIn);
        const encryptedMessage = this.cryptService.encrypt(JSON.stringify(sign));

        await this.userSignatureRequestDao.storeUserSignatureRequest(
            walletType,
            sign.domain[SignatureReqIdField[walletType]],
            expireAt,
            encryptedMessage
        );

        return sign;
    }

    async findActualSignatureByRequestId(
        requestId: string,
        lean = false
    ): Promise<IUserSignatureRequestLeanDocument | IUserSignatureRequestDocument | null> {
        return this.userSignatureRequestDao.findActualSignatureByRequestId(requestId, lean);
    }
}
