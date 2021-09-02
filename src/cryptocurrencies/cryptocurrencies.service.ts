import { Injectable } from '@nestjs/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { CryptocurrencyDao } from './dao/cryptocurrency.dao';
import { ExchangeService } from './exchange.service';
import { IBlockchainConfig } from '../config';
import { ConfigService } from '@nestjs/config';
import { ICryptocurrencyDocument, ICryptocurrencyLeanDocument } from './schemas/cryptocurrency.schema';
import { Network } from '../config/types/constants';

@Injectable()
export class CryptocurrenciesService extends MongooseService {
    constructor(
        private readonly cryptocurrencyDao: CryptocurrencyDao,
        private readonly exchangeService: ExchangeService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    protected get dao(): CryptocurrencyDao {
        return this.cryptocurrencyDao;
    }

    async updateCurrencies(): Promise<void> {
        const data = await this.exchangeService.getCurrenciesList();

        if (!data) {
            return null;
        }

        return this.cryptocurrencyDao.updateCurrencies(data);
    }

    async removeOldCurrencies(date: Date): Promise<void> {
        return this.cryptocurrencyDao.removeOldCurrencies(date);
    }

    async getAllowedCurrencies(blockchain: Network): Promise<Array<ICryptocurrencyLeanDocument>> {
        const { [blockchain]: { allowedCryptocurrencies } } = this.configService.get<IBlockchainConfig>('blockchain');

        return this.dao.getCurrenciesBySymbols(allowedCryptocurrencies.map(c => c.symbol), true);
    }

    async isAllowedCurrency(blockchain: Network, symbol: string): Promise<boolean> {
        return (await this.getAllowedCurrencies(blockchain)).map(c => c.symbol).includes(symbol);
    }

    async getCurrencyBySymbol(
        symbol: string,
        lean = false
    ): Promise<ICryptocurrencyLeanDocument | ICryptocurrencyDocument> {
        return this.dao.getCurrencyBySymbol(symbol, lean);
    }
}
