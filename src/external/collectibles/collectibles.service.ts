import { Injectable } from '@nestjs/common';
import { MongooseService } from '../../dao/mongoose/mongoose.service';
import { CollectibleDao } from './dao/collectible.dao';
import { ICollectibleDocument } from './schemas/collectible.schema';

@Injectable()
export class CollectiblesService extends MongooseService {
    constructor(private readonly collectibleDao: CollectibleDao) {
        super();
    }

    protected get dao(): CollectibleDao {
        return this.collectibleDao;
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
        return this.dao.storeCollectible(
            clientId,
            tokenMetadataId,
            maxSupply,
            externalCollectibleId,
            externalCreatorId,
            externalCreatorEmail,
            externalStoreId
        );
    }

    async existsCollectible(clientId: string, externalCollectibleId: string): Promise<boolean> {
        return this.dao.existsCollectible(clientId, externalCollectibleId);
    }
}
