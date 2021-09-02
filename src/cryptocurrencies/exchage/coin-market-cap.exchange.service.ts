import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ExchangeService, ICurrenciesExchangeData, ICurrencyFilter } from '../exchange.service';
import { HTTP_SERVICE, HttpService, IHttpResponse } from '../../utils/http.service';
import { ConfigService } from '@nestjs/config';
import { ICoinMarketCapConfig } from '../../config';
import { AxiosRequestConfig } from 'axios';
import { ICryptocurrencyLeanDocument } from '../schemas/cryptocurrency.schema';
import { CoinMarketCapResponse, ExchangeDataParams, IQuotesLatestData } from './types/scheme';
import { Currency } from '../../types/constants';

@Injectable()
export class CoinMarketCapExchangeService extends ExchangeService {
    private readonly baseUrl: string;

    private readonly apiKey: string;

    constructor(
        @Inject(HTTP_SERVICE) private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        super();
        const { apiKey, apiBaseUrl } = this.configService.get<ICoinMarketCapConfig>('services.exchange.coinMarketCap');
        this.apiKey = apiKey;
        this.baseUrl = apiBaseUrl;
    }

    async getCurrenciesList(): Promise<ICryptocurrencyLeanDocument[] | null> {
        const res = await this.makeRequest<ICryptocurrencyLeanDocument[]>('/v1/cryptocurrency/map');

        if (!CoinMarketCapExchangeService.checkSuccessResponse(res)) {
            return null;
        }

        return res.data.data;
    }

    async getRate(
        filter: ICurrencyFilter[],
        convert = Currency.usd
    ): Promise<ICurrenciesExchangeData[]> {
        const symbols = filter.filter(currency => !currency.symbolId);
        const symbolIds = filter.filter(currency => currency.symbolId);

        const exchangeData: { [key in string]: ICurrenciesExchangeData } = {};

        if (symbols.length) {
            const data = await this.requestExchangeData({
                symbol: symbols.map(item => item.symbol).toString(),
                convert
            });
            if (data) {
                data.map(item => exchangeData[item.symbolId] = item);
            }
        }

        if (symbolIds.length) {
            const data = await this.requestExchangeData({
                id: symbolIds.map(item => item.symbolId).toString(),
                convert
            });
            if (data) {
                data.map(item => exchangeData[item.symbolId] = item);
            }
        }

        return Object.values(exchangeData);
    }

    private async requestExchangeData(params: ExchangeDataParams): Promise<ICurrenciesExchangeData[] | null> {
        const res = await this.makeRequest<IQuotesLatestData>(
            '/v1/cryptocurrency/quotes/latest',
            { params }
        );

        if (!CoinMarketCapExchangeService.checkSuccessResponse(res)) {
            return null;
        }

        const exchangeData = [];
        const data = res.data.data;
        for (const prop in data) {
            if (data.hasOwnProperty(prop)) {
                const currency = data[prop];
                exchangeData.push({
                    symbol: currency.symbol,
                    symbolId: currency.id,
                    quote: currency.quote[params.convert].price,
                });
            }
        }

        return exchangeData;
    }

    private async makeRequest<T = any>(
        uri: string,
        config: AxiosRequestConfig = {}
    ): Promise<IHttpResponse<CoinMarketCapResponse<T>>> {
        return this.httpService.request<CoinMarketCapResponse<T>>(
            `${this.baseUrl}${uri}`,
            {
                ...config,
                headers: {
                    ...{
                        'X-CMC_PRO_API_KEY': this.apiKey,
                        'Accept': 'application/json',
                        'Accept-Encoding': 'deflate, gzip'
                    },
                    ...config?.headers
                }
            }
        );
    }

    private static checkSuccessResponse<T = any>(res: IHttpResponse<CoinMarketCapResponse<T>>): boolean {
        return res?.status === HttpStatus.OK && res.data.status.error_code === 0;
    }
}
