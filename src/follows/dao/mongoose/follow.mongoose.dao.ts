import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames, SortOrder } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { FollowDao } from '../follow.dao';
import {
    FollowTypeField,
    FollowTypeRefField,
    IFollowDocument,
    IFollowLeanDocument,
    IFollowQuery
} from '../../schemas/follows.schema';
import { FollowListQueryDto } from '../../dto/request/follow-list-query.dto';
import { IPaginatedList } from '../../../types/common';
import { FollowType } from '../../types/enums';

@Injectable()
export class FollowMongooseDao extends DaoMongoose implements FollowDao {
    @InjectModel(DaoModelNames.follow) private readonly followModel: Model<IFollowDocument>;

    protected get model(): Model<IFollowDocument> {
        return this.followModel;
    }

    async existFollow(userId: string, followUserId: string): Promise<boolean> {
        return this.model.exists({ userId, followUserId });
    }

    async storeNewFollow(userId: string, followUserId: string): Promise<IFollowDocument> {
        return this.model.create({ userId, followUserId });
    }

    async removeFollow(userId: string, followUserId: string): Promise<void> {
        await this.model.deleteMany({ userId, followUserId });
    }

    async getFollowsByTypeAndUserId(
        type: FollowType,
        userId: string,
        { sortOrder, offset, limit }: FollowListQueryDto,
        lean = true
    ): Promise<IPaginatedList<IFollowDocument | IFollowLeanDocument>> {
        const filter = { [FollowTypeField[type]]: userId };
        const query = this.model.find(filter) as IFollowQuery<IFollowDocument[]>;

        if (lean) {
            query.additionalLean();
        }

        const data = await query
            .populate({
                path: FollowTypeRefField[type],
                populate: 'countFollowers'
            })
            .sort({ ['_id']: sortOrder || SortOrder.desc  })
            .skip(offset)
            .limit(limit);
        const total = await this.model.find(filter).countDocuments();

        return { data, total, offset, limit };
    }
}
