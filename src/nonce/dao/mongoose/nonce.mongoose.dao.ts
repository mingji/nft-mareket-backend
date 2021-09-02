import { Model } from 'mongoose';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames, Nonce } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { NonceDao } from '../nonce.dao';
import { INonceDocument } from '../../schemas/nonce.schema';
import { Errors } from '../../../types/errors';

@Injectable()
export class NonceMongooseDao extends DaoMongoose implements NonceDao {
    @InjectModel(DaoModelNames.nonce) private readonly nonceModel: Model<INonceDocument>;

    protected get model(): Model<INonceDocument> {
        return this.nonceModel;
    }

    async initNonce(name: string, nonce: number): Promise<INonceDocument> {
        return this.nonceModel.create({ name, nonce });
    }

    async getNonce(name: string = Nonce.default): Promise<INonceDocument | null> {
        return this.nonceModel.findOne({ name });
    }

    async getNextNonce(name: string = Nonce.default): Promise<number> {
        const res = await this.getNonce(name);

        if (!res) {
            return null;
        }

        return res.nonce + 1;
    }

    async increment(name: string = Nonce.default): Promise<void> {
        const nonce = await this.getNonce(name);

        if (!nonce) {
            throw new InternalServerErrorException(Errors.NONCE_OBJECT_NOT_FOUND);
        }

        await this.nonceModel.updateOne({ name }, { $inc: { nonce: 1 } });
    }
}
