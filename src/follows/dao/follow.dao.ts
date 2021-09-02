import { Dao } from '../../dao/dao';
import { IFollowDocument, IFollowLeanDocument } from '../schemas/follows.schema';
import { FollowListQueryDto } from '../dto/request/follow-list-query.dto';
import { IPaginatedList } from '../../types/common';
import { FollowType } from '../types/enums';

export abstract class FollowDao extends Dao {
    public abstract existFollow(userId: string, followUserId: string): Promise<boolean>;

    public abstract storeNewFollow(userId: string, followUserId: string): Promise<IFollowDocument>;

    public abstract removeFollow(userId: string, followUserId: string): Promise<void>;

    public abstract getFollowsByTypeAndUserId(
        type: FollowType,
        userId: string,
        query: FollowListQueryDto,
        lean?: boolean
    ): Promise<IPaginatedList<IFollowDocument | IFollowLeanDocument>>;
}
