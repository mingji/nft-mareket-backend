import { IUserSessionDocument } from '../schemas/user-session.schema';
import { Dao } from '../../dao/dao';

export abstract class UserSessionDao extends Dao {
    public abstract createUserSession(userId: string, expireAt: Date): Promise<IUserSessionDocument | null>;

    public abstract deleteSessionById(sessionId: string): Promise<IUserSessionDocument | null>;
}
