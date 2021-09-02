import { Module } from '@nestjs/common';
import { UserSignatureRequestsService } from './user-signature-requests.service';
import { CryptModule } from '../crypt/crypt.module';
import { ConfigModule } from '@nestjs/config';
import { DaoModule } from '../dao/dao.module';
import userSignRequestDaoOptions from '../signTypeData/dao/options/user-signature-request.dao.options';
import { SignTypeDataService } from './sign-type-data.service';

@Module({
    imports: [DaoModule.forFeature(userSignRequestDaoOptions), CryptModule, ConfigModule],
    providers: [SignTypeDataService, UserSignatureRequestsService],
    exports: [SignTypeDataService, UserSignatureRequestsService]
})
export class SignTypeDataModule {}
