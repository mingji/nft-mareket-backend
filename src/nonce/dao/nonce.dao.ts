import { Dao } from '../../dao/dao';
import { INonceDocument } from '../schemas/nonce.schema';

export abstract class NonceDao extends Dao {
    public abstract initNonce(name: string, nonce: number): Promise<INonceDocument>;

    public abstract getNonce(name: string): Promise<INonceDocument>;

    public abstract getNextNonce(name: string): Promise<number>;

    public abstract increment(name: string): Promise<void>;
}
