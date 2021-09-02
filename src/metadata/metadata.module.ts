import { forwardRef, Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import { tokenMetadataDaoOptions, contractMetadataDaoOptions } from './dao/options';
import { MetadataController } from './metadata.controller';
import { UtilsModule } from '../utils/utils.module';
import { ContractMetadataService, TokenMetadataService } from './services';
import { UsersModule } from '../users/users.module';
import { TokenCollectionsModule } from '../tokenCollections/token-collections.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        DaoModule.forFeature(tokenMetadataDaoOptions),
        DaoModule.forFeature(contractMetadataDaoOptions),
        UtilsModule,
        UsersModule,
        ConfigModule,
        forwardRef(() => TokenCollectionsModule)
    ],
    controllers: [MetadataController],
    providers: [ContractMetadataService, TokenMetadataService],
    exports: [ContractMetadataService, TokenMetadataService]
})
export class MetadataModule {}
