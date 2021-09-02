import { Module } from '@nestjs/common';
import { UserSessionsService } from './user-sessions.service';
import { DaoModule } from '../dao/dao.module';
import userSessionDaoOptions from './dao/options/user-session.dao.options';

@Module({
    imports: [DaoModule.forFeature(userSessionDaoOptions)],
    providers: [UserSessionsService],
    exports: [UserSessionsService]
})
export class UserSessionsModule {}
