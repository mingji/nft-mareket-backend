import { registerAs } from '@nestjs/config';

export interface ICoinMarketCapConfig {
    apiKey: string | null;
    apiBaseUrl: string;
}

export interface IExchangeConfig {
    coinMarketCap: ICoinMarketCapConfig;
}

export interface IServicesConfig {
    exchange: IExchangeConfig;
}

export const servicesConfig = registerAs('services', () => ({
    exchange: {
        coinMarketCap: {
            apiKey: process.env.COIN_MARKET_CAP_API_KEY || null,
            apiBaseUrl: process.env.COIN_MARKET_CAP_API_BASE_URL || 'https://pro-api.coinmarketcap.com',
        }
    }
}));
