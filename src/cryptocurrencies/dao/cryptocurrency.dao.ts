import { Dao } from '../../dao/dao';
import { ICryptocurrencyDocument, ICryptocurrencyLeanDocument } from '../schemas/cryptocurrency.schema';

export abstract class CryptocurrencyDao extends Dao {
    public abstract removeOldCurrencies(date: Date): Promise<void>;

    public abstract updateCurrencies(data: ICryptocurrencyLeanDocument[]): Promise<void>;

    public abstract getCurrencyBySymbol(
        symbol: string,
        lean?: boolean
    ): Promise<ICryptocurrencyLeanDocument | ICryptocurrencyDocument | null>;

    public abstract getCurrenciesBySymbols(
        symbols: string[],
        lean?: boolean
    ): Promise<Array<ICryptocurrencyLeanDocument | ICryptocurrencyDocument>>;
}
