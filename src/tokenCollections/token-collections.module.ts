import { forwardRef, Module } from '@nestjs/common';
import { TokenCollectionsService } from './token-collections.service';
import { TokenCollectionsController } from './token-collections.controller';
import { CardsModule } from '../cards/cards.module';
import { UsersModule } from '../users/users.module';
import { DaoModule } from '../dao/dao.module';
import tokenCollectionDaoOptions from '../tokenCollections/dao/options/token-collection.dao.options';
import { SubgraphModule } from '../subgraph/subgraph.module';
import { ConfigModule } from '@nestjs/config';
import { JobsModule } from '../jobs/jobs.module';
import { UtilsModule } from '../utils/utils.module';
import { MetadataModule } from '../metadata/metadata.module';
import { MailModule } from '../mailer/mail.module';

@Module({
    imports: [
        DaoModule.forFeature(tokenCollectionDaoOptions),
        forwardRef(() => CardsModule),
        UsersModule,
        SubgraphModule,
        ConfigModule,
        JobsModule,
        UtilsModule,
        MailModule,
        forwardRef(() => MetadataModule),
    ],
    providers: [TokenCollectionsService],
    exports: [TokenCollectionsService],
    controllers: [TokenCollectionsController]
})
export class TokenCollectionsModule {}
