import { Dao } from '../../../dao/dao';
import { IClientDocument } from '../schemas/client.schema';

export abstract class ClientDao extends Dao {
    public abstract findByClientId(clientId: string): Promise<IClientDocument | null>;
}
