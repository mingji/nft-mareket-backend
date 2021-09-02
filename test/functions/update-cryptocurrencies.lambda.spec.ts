import { Test } from "@nestjs/testing";
import {
    baseAppModules, baseAppProviders,
    clearDb,
    COIN_MARKET_FAIL_RESPONSE,
    COIN_MARKET_SUCCESS_MAP_RESPONSE, randomCryptocurrency,
    shutdownTest
} from '../lib';
import { HttpStatus } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing/testing-module';
import { CryptocurrenciesService } from '../../src/cryptocurrencies/cryptocurrencies.service';
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { ICryptocurrencyDocument } from '../../src/cryptocurrencies/schemas/cryptocurrency.schema';
import { Connection, Model } from 'mongoose';
import { CryptocurrenciesModule } from '../../src/cryptocurrencies/cryptocurrencies.module';

describe('updateCryptocurrencies-lambda', () => {
    let httpService: HttpService;
    let cryptocurrenciesService: CryptocurrenciesService;
    let cryptocurrencyModel: Model<ICryptocurrencyDocument>;
    let app: TestingModule;
    let dbConnection: Connection;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CryptocurrenciesModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        httpService = app.get<HttpService>(HTTP_SERVICE);
        cryptocurrenciesService = app.get(CryptocurrenciesService);
        cryptocurrencyModel = app.get(getModelToken(DaoModelNames.cryptocurrency));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('updateCurrencies should update currencies list', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_SUCCESS_MAP_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));
        const currencies = response.data.data;

        expect(await cryptocurrencyModel.find().countDocuments()).toBe(0);
        await cryptocurrenciesService.updateCurrencies();
        expect(await cryptocurrencyModel.find().countDocuments()).toBe(currencies.length);

        await cryptocurrenciesService.updateCurrencies();
        expect(await cryptocurrencyModel.find().countDocuments()).toBe(currencies.length);

        const currency = await cryptocurrencyModel.findOne();
        expect(currency).toBeDefined();
        expect(currency.id).toBe(currencies[0].id);
    });

    it('updateCurrencies should doesnt update currencies list when response currencies fail', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_FAIL_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));

        await cryptocurrencyModel.create(randomCryptocurrency());
        expect(await cryptocurrencyModel.find().countDocuments()).toBe(1);
        await cryptocurrenciesService.updateCurrencies();
        expect(await cryptocurrencyModel.find().countDocuments()).toBe(1);
    });
});