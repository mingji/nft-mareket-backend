import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DaoModule } from '../dao/dao.module';
import { UsersController } from './users.controller';
import userDaoOptions from './dao/options/user.dao.options';
import { UtilsModule } from '../utils/utils.module';
import { SignTypeDataModule } from '../signTypeData/sign-type-data.module';
import { MailModule } from '../mailer/mail.module';

@Module({
    imports: [
        DaoModule.forFeature(userDaoOptions),
        UtilsModule,
        SignTypeDataModule,
        MailModule,
    ],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController]
})
export class UsersModule {}
