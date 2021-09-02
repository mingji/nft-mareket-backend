import { Dao } from '../../../dao/dao';
import { ICollectibleDocument } from '../schemas/collectible.schema';

export abstract class CollectibleDao extends Dao {
    public abstract storeCollectible(
        clientId: string,
        tokenMetadataId: string,
        maxSupply: number,
        externalCollectibleId: string,
        externalCreatorId: string,
        externalCreatorEmail: string,
        externalStoreId?: string
    ): Promise<ICollectibleDocument>;

    public abstract existsCollectible(clientId: string, externalCollectibleId: string): Promise<boolean>;
}
