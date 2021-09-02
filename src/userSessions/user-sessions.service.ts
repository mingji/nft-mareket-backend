import { Injectable } from '@nestjs/common';
import { IUserSessionDocument } from './schemas/user-session.schema';
import { UserSessionDao } from './dao/user-session.dao';
import { MongooseService } from '../dao/mongoose/mongoose.service';

@Injectable()
export class UserSessionsService extends MongooseService {
    constructor(private readonly userSessionDao: UserSessionDao) {
        super();
    }

    protected get dao(): UserSessionDao {
        return this.userSessionDao;
    }

    async createUserSession(userId: string, expireAt: Date): Promise<IUserSessionDocument | null> {
        return this.userSessionDao.createUserSession(userId, expireAt);
    }

    async deleteSessionById(sessionId: string): Promise<IUserSessionDocument | null> {
        return this.userSessionDao.deleteSessionById(sessionId);
    }
}
