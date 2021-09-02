import { Module } from '@nestjs/common';
import clientDaoOptions from './dao/options/client.dao.options';
import { DaoModule } from '../../dao/dao.module';
import { ClientsService } from './clients.service';

@Module({
    imports: [DaoModule.forFeature(clientDaoOptions)],
    providers: [ClientsService],
    exports: [ClientsService]
})
export class ClientsModule {}
