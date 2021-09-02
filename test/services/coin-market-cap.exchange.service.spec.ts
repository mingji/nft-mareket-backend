import { Test } from "@nestjs/testing";
import {
    baseAppModules, baseAppProviders,
    COIN_MARKET_FAIL_RESPONSE,
    COIN_MARKET_SUCCESS_MAP_RESPONSE,
    COIN_MARKET_SUCCESS_QUOTES_RESPONSE,
    shutdownTest
} from '../lib';
import { HttpStatus, Module } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing/testing-module';
import { CoinMarketCapExchangeService } from '../../src/cryptocurrencies/exchage/coin-market-cap.exchange.service';
import { ExchangeService } from '../../src/cryptocurrencies/exchange.service';
import { DaoModule } from '../../src/dao/dao.module';
import cryptocurrencyDaoOptions from '../../src/cryptocurrencies/dao/options/cryptocurrency.dao.options';
import { UtilsModule } from '../../src/utils/utils.module';
import { ConfigModule } from '@nestjs/config';
import { CryptocurrenciesService } from '../../src/cryptocurrencies/cryptocurrencies.service';
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('CoinMarketCapExchangeService', () => {
    let exchangeService: ExchangeService;
    let httpService: HttpService;
    let dbConnection: Connection;
    let app: TestingModule;

    beforeAll(async () => {
        const ExchangeProvider = {
            provide: ExchangeService,
            useClass: CoinMarketCapExchangeService
        };

        @Module({
            imports: [DaoModule.forFeature(cryptocurrencyDaoOptions), UtilsModule, ConfigModule],
            providers: [CryptocurrenciesService, ExchangeProvider],
            exports: [CryptocurrenciesService, ExchangeProvider]
        })
        class CryptocurrenciesModule {}

        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CryptocurrenciesModule],
            providers: [...baseAppProviders()]
        }).compile();

        exchangeService = app.get(ExchangeService);
        dbConnection = app.get(getConnectionToken());
        httpService = app.get<HttpService>(HTTP_SERVICE);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(exchangeService).toBeDefined();
    });

    it('getCurrenciesList should get currencies list', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_SUCCESS_MAP_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));
        const currencies = response.data.data;

        const res = await exchangeService.getCurrenciesList();
        expect(res).toBeDefined();
        expect(res).toBeInstanceOf(Array);
        expect(res.length).toBe(currencies.length);
        expect(res[0]).toBeDefined();
        expect(res[0].id).toBeDefined();
        expect(res[0].id).toBe(currencies[0].id);
        expect(res[0].symbol).toBeDefined();
        expect(res[0].symbol).toBe(currencies[0].symbol);
    });

    it('getCurrenciesList should return null if error response', async () => {
        const response = {
            status: HttpStatus.NOT_FOUND,
            data: COIN_MARKET_FAIL_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));

        const res = await exchangeService.getCurrenciesList();
        expect(res).toBeDefined();
        expect(res).toBeNull();
    });

    it('getRate should get currencies quotes latest list', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_SUCCESS_QUOTES_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));
        const quotes = response.data.data;

        const res = await exchangeService.getRate(
            [{ symbolId: 1, symbol: 'TST' }]
        );
        expect(res).toBeDefined();
        expect(res).toBeInstanceOf(Array);
        expect(res.length).toBe(Object.values(quotes).length);
        expect(res[0]).toBeDefined();
        expect(res[0].symbolId).toBeDefined();
        expect(res[0].symbolId).toBe(quotes[1].id);
        expect(res[0].symbol).toBeDefined();
        expect(res[0].symbol).toBe(quotes[1].symbol);
        expect(res[0].quote).toBeDefined();
        expect(res[0].quote).toBe(quotes[1].quote['USD'].price);
    });
});