import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { NonceDao } from './dao/nonce.dao';
import { Nonce } from '../types/constants';
import { Errors } from '../types/errors';
import { INonceDocument } from './schemas/nonce.schema';

@Injectable()
export class NonceService extends MongooseService {
    constructor(private readonly nonceDao: NonceDao) {
        super();
    }

    protected get dao(): NonceDao {
        return this.nonceDao;
    }

    async initNonce(name: string, nonce: number): Promise<INonceDocument> {
        return this.dao.initNonce(name, nonce);
    }

    async getNextNonce(name: string = Nonce.default): Promise<number> {
        const nonce = await this.dao.getNextNonce(name);

        if (!nonce) {
            throw new InternalServerErrorException(Errors.NONCE_OBJECT_NOT_FOUND)
        }

        return nonce;
    }

    async increaseNonce(name: string = Nonce.default): Promise<void> {
        await this.dao.increment(name);
    }
}
