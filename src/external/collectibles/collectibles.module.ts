import { Module } from '@nestjs/common';
import collectibleDaoOptions from './dao/options/collectible.dao.options';
import { DaoModule } from '../../dao/dao.module';
import { CollectiblesService } from './collectibles.service';
import { CollectiblesController } from './collectibles.controller';
import { MetadataModule } from '../../metadata/metadata.module';
import { UsersModule } from '../../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from '../clients/clients.module';

@Module({
    imports: [
        DaoModule.forFeature(collectibleDaoOptions),
        MetadataModule,
        UsersModule,
        ConfigModule,
        ClientsModule
    ],
    controllers: [CollectiblesController],
    providers: [CollectiblesService],
    exports: [CollectiblesService]
})
export class CollectiblesModule {}
