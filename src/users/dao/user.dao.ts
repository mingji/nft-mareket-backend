import { IUserDocument, IUserLeanDocument } from '../schemas/user.schema';
import { Dao } from '../../dao/dao';

export abstract class UserDao extends Dao {
    public abstract findUserByEthAddress(ethAddress: string): Promise<IUserDocument | null>;

    public abstract findUserBySlug(
        slug: string,
    ): Promise<IUserDocument | null>;

    public abstract createUser(ethAddress: string): Promise<IUserDocument | null>;

    public abstract syncUsers(ethAddresses: string[]): Promise<void>;

    public abstract getUsersByEthAddresses(
        ethAddresses: string[],
        lean?: boolean
    ): Promise<Array<IUserLeanDocument | IUserDocument | null>>;

    public abstract updateUserById(userId: string, data: Partial<IUserDocument>): Promise<void>;
}
