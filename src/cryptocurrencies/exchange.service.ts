import { ICryptocurrencyLeanDocument } from './schemas/cryptocurrency.schema';

export interface ICurrenciesExchangeData {
    symbol: string;
    symbolId?: number;
    quote: number;
}

export interface ICurrencyFilter {
    symbol: string;
    symbolId?: number | null
}

export abstract class ExchangeService {
    public abstract getCurrenciesList(): Promise<ICryptocurrencyLeanDocument[] | null>;

    public abstract getRate(filter: ICurrencyFilter[]): Promise<ICurrenciesExchangeData[]>;
}
