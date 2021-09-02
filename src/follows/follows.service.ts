import { Injectable } from '@nestjs/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { FollowDao } from './dao/follow.dao';
import { IFollowDocument, IFollowLeanDocument } from './schemas/follows.schema';
import { FollowListQueryDto } from './dto/request/follow-list-query.dto';
import { IPaginatedList } from '../types/common';
import { FollowType } from './types/enums';

@Injectable()
export class FollowsService extends MongooseService {
    constructor(
        private readonly followDao: FollowDao
    ) {
        super();
    }

    protected get dao(): FollowDao {
        return this.followDao;
    }

    async existFollow(userId: string, followUserId: string): Promise<boolean> {
        return this.dao.existFollow(userId, followUserId);
    }

    async storeNewFollow(userId: string, followUserId: string): Promise<IFollowDocument> {
        return this.dao.storeNewFollow(userId, followUserId);
    }

    async removeFollow(userId: string, followUserId: string): Promise<void> {
        await this.dao.removeFollow(userId, followUserId);
    }

    async getFollowsByTypeAndUserId(
        type: FollowType,
        userId: string,
        query: FollowListQueryDto
    ): Promise<IPaginatedList<IFollowLeanDocument>> {
        return this.dao.getFollowsByTypeAndUserId(type, userId, query);
    }
}
