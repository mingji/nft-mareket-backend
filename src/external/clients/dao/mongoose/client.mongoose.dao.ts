import { DaoMongoose } from '../../../../dao/mongoose/dao.mongoose';
import { ClientDao } from '../client.dao';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../../types/constants';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IClientDocument } from '../../schemas/client.schema';

@Injectable()
export class ClientMongooseDao extends DaoMongoose implements ClientDao {
    @InjectModel(DaoModelNames.externalClient)
    private readonly clientModel: Model<IClientDocument>;

    protected get model(): Model<IClientDocument> {
        return this.clientModel;
    }

    async findByClientId(clientId: string): Promise<IClientDocument | null> {
        return this.model.findOne({ clientId });
    }
}
