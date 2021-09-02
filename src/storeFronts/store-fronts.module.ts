import { Module } from '@nestjs/common';
import { StoreFrontsController } from './store-fronts.controller';
import { StoreFrontsService } from './store-fronts.service';
import { DaoModule } from '../dao/dao.module';
import storeFrontDaoProvider from './dao/options/store-front.dao.options';
import { UtilsModule } from '../utils/utils.module';
import { CardsModule } from '../cards/cards.module';
import { TokenCollectionsModule } from '../tokenCollections/token-collections.module';
import { ExistCollectionsInStoreFrontConstraint } from './dto/rules/exist-collections-in-store-front';
import { ExistCardsInStoreFrontConstraint } from './dto/rules/exist-cards-in-store-front';
import { UserStoreFrontsController } from './user-store-fronts.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        DaoModule.forFeature(storeFrontDaoProvider),
        UtilsModule,
        CardsModule,
        TokenCollectionsModule,
        UsersModule
    ],
    providers: [StoreFrontsService, ExistCollectionsInStoreFrontConstraint, ExistCardsInStoreFrontConstraint],
    controllers: [StoreFrontsController, UserStoreFrontsController],
    exports: [StoreFrontsService]
})
export class StoreFrontsModule {}
