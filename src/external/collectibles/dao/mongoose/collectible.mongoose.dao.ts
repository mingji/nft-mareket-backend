import { DaoMongoose } from '../../../../dao/mongoose/dao.mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../../types/constants';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { CollectibleDao } from '../collectible.dao';
import { ICollectibleDocument } from '../../schemas/collectible.schema';

@Injectable()
export class CollectibleMongooseDao extends DaoMongoose implements CollectibleDao {
    @InjectModel(DaoModelNames.externalCollectible)
    private readonly collectibleModel: Model<ICollectibleDocument>;

    protected get model(): Model<ICollectibleDocument> {
        return this.collectibleModel;
    }

    async storeCollectible(
        clientId: string,
        tokenMetadataId: string,
        maxSupply: number,
        externalCollectibleId: string,
        externalCreatorId: string,
        externalCreatorEmail: string,
        externalStoreId?: string
    ): Promise<ICollectibleDocument> {
        return this.model.create({
            clientId,
            externalCollectibleId,
            externalCreatorId,
            externalCreatorEmail,
            maxSupply,
            externalStoreId,
            tokenMetadataId
        });
    }

    async existsCollectible(clientId: string, externalCollectibleId: string): Promise<boolean> {
        return this.model.exists({ clientId, externalCollectibleId });
    }
}
