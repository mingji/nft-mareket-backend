import { forwardRef, Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import cardSaleDaoOptions from '../cardSales/dao/options/card-sale.dao.options';
import { CardSalesService } from './card-sales.service';
import { CryptocurrenciesModule } from '../cryptocurrencies/cryptocurrencies.module';
import { CardSalesController } from './card-sales.controller';
import { CardsModule } from '../cards/cards.module';
import { TokenCollectionsModule } from '../tokenCollections/token-collections.module';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { SignTypeDataModule } from '../signTypeData/sign-type-data.module';
import { JobsModule } from '../jobs/jobs.module';
import { SubgraphModule } from '../subgraph/subgraph.module';
import { UsersModule } from '../users/users.module';
import { SalesController } from './sales.controller';

@Module({
    imports: [
        DaoModule.forFeature(cardSaleDaoOptions),
        CryptocurrenciesModule,
        forwardRef(() => CardsModule),
        forwardRef(() => TokenCollectionsModule),
        ConfigModule,
        BlockchainModule,
        SignTypeDataModule,
        JobsModule,
        SubgraphModule,
        UsersModule,
    ],
    providers: [CardSalesService],
    exports: [CardSalesService],
    controllers: [CardSalesController, SalesController]
})
export class CardSalesModule {}
