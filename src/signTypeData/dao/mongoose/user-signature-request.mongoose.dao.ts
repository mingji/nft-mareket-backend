import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import {
    IUserSignatureRequestDocument,
    IUserSignatureRequestLeanDocument,
    IUserSignatureRequestQuery
} from '../../schemas/user-signature-request.schema';
import { UserSignatureRequestDao } from '../user-signature-request.dao';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { IEncryptedData } from '../../../types/scheme';
import { WalletType } from '../../types/sign-scheme';

@Injectable()
export class UserSignatureRequestMongooseDao extends DaoMongoose implements UserSignatureRequestDao {
    @InjectModel(DaoModelNames.userSignatureRequest)
    private readonly userSignatureRequestModel: Model<IUserSignatureRequestDocument>;

    protected get model(): Model<IUserSignatureRequestDocument> {
        return this.userSignatureRequestModel;
    }

    async storeUserSignatureRequest(
        walletType: WalletType,
        requestId: string,
        expireAt: Date,
        message: IEncryptedData
    ): Promise<IUserSignatureRequestDocument | null> {
        return this.userSignatureRequestModel.create({ walletType, requestId, expireAt, message });
    }

    async findActualSignatureByRequestId(
        requestId: string,
        lean = false
    ): Promise<IUserSignatureRequestLeanDocument | IUserSignatureRequestDocument | null> {
        const query = this.userSignatureRequestModel
            .findOne({ requestId })
            .where('expireAt')
            .gte(Date.now()) as IUserSignatureRequestQuery<IUserSignatureRequestDocument>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }
}
