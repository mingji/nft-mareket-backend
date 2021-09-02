import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IUserSessionDocument } from '../../schemas/user-session.schema';
import { UserSessionDao } from '../user-session.dao';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';

@Injectable()
export class UserSessionMongooseDao extends DaoMongoose implements UserSessionDao {
    @InjectModel(DaoModelNames.userSession) private readonly userSessionModel: Model<IUserSessionDocument>;

    protected get model(): Model<IUserSessionDocument> {
        return this.userSessionModel;
    }

    async createUserSession(userId: string, expireAt: Date): Promise<IUserSessionDocument | null> {
        return this.userSessionModel.create({ userId, expireAt });
    }

    async deleteSessionById(sessionId: string): Promise<IUserSessionDocument | null> {
        return this.userSessionModel.findByIdAndDelete(sessionId).exec();
    }
}
