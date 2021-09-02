import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    prepareDb,
    prepareNonce,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../src/types/constants';
import { NonceModule } from '../src/nonce/nonce.module';
import { AuthModule } from '../src/auth/auth.module';
import { INonceDocument, INonceLeanDocument } from '../src/nonce/schemas/nonce.schema';
import { Errors } from '../src/types/errors';

describe('NonceController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let defaultHeaders: { Authorization: string };
    let defaultNonce: INonceLeanDocument;
    let nonceModel: Model<INonceDocument>;
    let server: any;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, NonceModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        nonceModel = app.get(getModelToken(DaoModelNames.nonce));
    });

    beforeEach(async () => {
        defaultNonce = await prepareNonce(dbConnection);
        const data = await prepareDb(app, dbConnection);
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/nonce should return next nonce', async () => {
        const res = await request(server)
            .get(`/nonce`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.nonce).toBeDefined();
        expect(res.body.nonce).toBe(defaultNonce.nonce + 1);
    });

    it('/nonce should return unauthorized response without auth token', async () => {
        await request(server).get(`/nonce`).expect(HttpStatus.UNAUTHORIZED);
    });

    it('/nonce should throw NONCE_OBJECT_NOT_FOUND', async () => {
        await nonceModel.deleteMany();

        const res = await request(server)
            .get(`/nonce`)
            .set(defaultHeaders)
            .expect(HttpStatus.INTERNAL_SERVER_ERROR);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.NONCE_OBJECT_NOT_FOUND);
    });
});
