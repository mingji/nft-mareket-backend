import { ICryptocurrencyPlatform } from '../../schemas/cryptocurrency.schema';

export interface CoinMarketCapResponse<T = any> {
    status: {
        timestamp: string;
        error_code: number;
        error_message: string;
        elapsed: number;
        credit_count: number;
    }
    data: T;
}

export type IQuotesLatestData = {
    [key in number]: {
        id: number;
        name: string;
        symbol: string;
        slug: string;
        is_active: number;
        is_fiat: number;
        cmc_rank: number;
        num_market_pairs: number;
        circulating_supply: number;
        total_supply: number;
        market_cap_by_total_supply: number;
        max_supply: number;
        date_added: string;
        tags: string[];
        platform : ICryptocurrencyPlatform;
        last_updated: string[];
        quote: {
            [key in string]: {
                price: number;
            };
        };
    }
}

export interface ExchangeDataParams {
    symbol?: string;
    id?: string;
    convert: string;
}