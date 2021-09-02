import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    clearDb,
    createApp,
    shutdownTest,
    expectArrayResponse,
    prepareCryptocurrencies,
    baseAppProviders
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { CryptocurrenciesModule } from '../src/cryptocurrencies/cryptocurrencies.module';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from '../src/config';
import { ICryptocurrencyDocument } from '../src/cryptocurrencies/schemas/cryptocurrency.schema';
import { DaoModelNames } from '../src/types/constants';
import { Network } from '../src/config/types/constants';

describe('Cryptocurrencies (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let configService: ConfigService;
    let cryptocurrencyModel: Model<ICryptocurrencyDocument>;
    let server: any;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), CryptocurrenciesModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        configService = app.get(ConfigService);
        cryptocurrencyModel = app.get(getModelToken(DaoModelNames.cryptocurrency));
        server = app.getHttpServer();
    });

    beforeEach(async () => {
        await prepareCryptocurrencies(dbConnection);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/cryptocurrencies should return list of allowed cryptocurrencies ETHEREUM', async () => {
        const { [Network.ETHEREUM]: { allowedCryptocurrencies } } = configService.get<IBlockchainConfig>('blockchain');
        const currenciesCount = await cryptocurrencyModel.countDocuments();

        const res = await request(server)
            .get(`/cryptocurrencies`)
            .query({ network: Network.ETHEREUM })
            .expect(HttpStatus.OK);

        expectArrayResponse(res);
        expect(res.body.total).toBeLessThan(currenciesCount);
        expect(res.body.total).toBe(allowedCryptocurrencies.length);
        res.body.data.forEach(currency => {
            expect(allowedCryptocurrencies.map(c => c.symbol).includes(currency.symbol)).toBeTruthy()
        });
    });

    it('/cryptocurrencies should return list of allowed cryptocurrencies MATIC', async () => {
        const { [Network.MATIC]: { allowedCryptocurrencies } } = configService.get<IBlockchainConfig>('blockchain');
        const currenciesCount = await cryptocurrencyModel.countDocuments();

        const res = await request(server)
            .get(`/cryptocurrencies`)
            .query({ network: Network.MATIC })
            .expect(HttpStatus.OK);

        expectArrayResponse(res);
        expect(res.body.total).toBeLessThan(currenciesCount);
        expect(res.body.total).toBe(allowedCryptocurrencies.length);
        res.body.data.forEach(currency => {
            expect(allowedCryptocurrencies.map(c => c.symbol).includes(currency.symbol)).toBeTruthy()
        });
    });

    it('/cryptocurrencies should return 400 without network query', async () => {
        await request(server)
            .get(`/cryptocurrencies`)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/cryptocurrencies should return 400 with wrong network query', async () => {
        await request(server)
            .get(`/cryptocurrencies`)
            .query({ network: 'wrong' })
            .expect(HttpStatus.BAD_REQUEST);
    });
});
