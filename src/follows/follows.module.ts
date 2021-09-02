import { Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import followDaoOptions from './dao/options/follow.dao.options';
import { UsersModule } from '../users/users.module';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';

@Module({
    imports: [
        DaoModule.forFeature(followDaoOptions),
        UsersModule
    ],
    providers: [FollowsService],
    controllers: [FollowsController],
    exports: [FollowsService]
})
export class FollowsModule {}
