import { forwardRef, Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { DaoModule } from '../dao/dao.module';
import cardDaoOptions from '../cards/dao/options/card.dao.options';
import { UsersModule } from '../users/users.module';
import { CardSalesModule } from '../cardSales/card-sales.module';
import { UtilsModule } from '../utils/utils.module';
import { SubgraphModule } from '../subgraph/subgraph.module';
import { FilesModule } from '../files/files.module';
import { CardViewersModule } from '../cardViewers/card-viewers.module';
import { JobsModule } from '../jobs/jobs.module';
import { MetadataModule } from '../metadata/metadata.module';
import { TokenCollectionsModule } from '../tokenCollections/token-collections.module';
import { MailModule } from '../mailer/mail.module';

@Module({
    imports: [
        DaoModule.forFeature(cardDaoOptions),
        forwardRef(() => CardSalesModule),
        UsersModule,
        UtilsModule,
        SubgraphModule,
        FilesModule,
        CardViewersModule,
        JobsModule,
        MailModule,
        forwardRef(() => MetadataModule),
        forwardRef(() => TokenCollectionsModule)
    ],
    providers: [CardsService],
    controllers: [CardsController],
    exports: [CardsService]
})
export class CardsModule {}
