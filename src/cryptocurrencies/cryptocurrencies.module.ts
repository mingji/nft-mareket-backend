import { Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import cryptocurrencyDaoOptions from './dao/options/cryptocurrency.dao.options';
import { CryptocurrenciesService } from './cryptocurrencies.service';
import { ExchangeService } from './exchange.service';
import { CoinMarketCapExchangeService } from './exchage/coin-market-cap.exchange.service';
import { UtilsModule } from '../utils/utils.module';
import { ConfigModule } from '@nestjs/config';
import { CryptocurrenciesController } from './cryptocurrencies.controller';

const ExchangeProvider = {
    provide: ExchangeService,
    useClass: CoinMarketCapExchangeService
};

@Module({
    imports: [DaoModule.forFeature(cryptocurrencyDaoOptions), UtilsModule, ConfigModule],
    providers: [CryptocurrenciesService, ExchangeProvider],
    controllers: [CryptocurrenciesController],
    exports: [CryptocurrenciesService, ExchangeProvider]
})
export class CryptocurrenciesModule {}
