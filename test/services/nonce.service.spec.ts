import { Test } from "@nestjs/testing";
import { baseAppModules, baseAppProviders, clearDb, shutdownTest } from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { DaoModelNames, Nonce } from '../../src/types/constants';
import { NonceModule } from '../../src/nonce/nonce.module';
import { NonceService } from '../../src/nonce/nonce.service';
import { INonceDocument } from '../../src/nonce/schemas/nonce.schema';
import { Errors } from '../../src/types/errors';

describe('NonceService', () => {
    let app: TestingModule;
    let dbConnection: Connection;
    let nonceService: NonceService;
    let nonceModel: Model<INonceDocument>;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), NonceModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        nonceService = app.get(NonceService);
        nonceModel = app.get(getModelToken(DaoModelNames.nonce));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(nonceService).toBeDefined();
    });

    it('[initNonce] should should init new nonce instance', async () => {
        let nonceData = await nonceModel.find();
        expect(nonceData.length).toBe(0);

        await nonceService.initNonce(Nonce.default, 0);
        nonceData = await nonceModel.find();
        expect(nonceData.length).toBe(1);
        expect(nonceData[0].name).toBeDefined();
        expect(nonceData[0].name).toBe(Nonce.default);
    });

    it('[initNonce] should throw mongo unique index error', async () => {
        let nonceData = await nonceModel.find();
        expect(nonceData.length).toBe(0);

        await nonceService.initNonce(Nonce.default, 0);
        nonceData = await nonceModel.find();
        expect(nonceData.length).toBe(1);

        await expect(nonceService.initNonce(Nonce.default, 0))
            .rejects
            .toThrow();
    });

    it('[getNextNonce] should return next nonce number', async () => {
        await nonceService.initNonce(Nonce.default, 0);
        const nonceInstance = await nonceModel.findOne({ name: Nonce.default });
        const nextNonce = await nonceService.getNextNonce(Nonce.default);

        expect(nextNonce).toBeDefined();
        expect(nextNonce).toBe(nonceInstance.nonce + 1);
    });

    it('[getNextNonce] should throw NONCE_OBJECT_NOT_FOUND if nonce doesnt exist', async () => {
        await expect(nonceService.getNextNonce(Nonce.default))
            .rejects
            .toThrow(Errors.NONCE_OBJECT_NOT_FOUND);
    });

    it('[increment] should increase nonce instance', async () => {
        await nonceService.initNonce(Nonce.default, 0);
        const nonceInstanceBefore = await nonceModel.findOne({ name: Nonce.default });
        expect(nonceInstanceBefore).toBeDefined();
        expect(nonceInstanceBefore.nonce).toBeDefined();
        await nonceService.increaseNonce(Nonce.default);

        const nonceInstanceAfter = await nonceModel.findOne({ name: Nonce.default });
        expect(nonceInstanceAfter).toBeDefined();
        expect(nonceInstanceAfter.nonce).toBeDefined();
        expect(nonceInstanceAfter.nonce).toBe(nonceInstanceBefore.nonce + 1);
    });

    it('[increment] should throw NONCE_OBJECT_NOT_FOUND if nonce doesnt exist', async () => {
        await expect(nonceService.increaseNonce(Nonce.default))
            .rejects
            .toThrow(Errors.NONCE_OBJECT_NOT_FOUND);
    });
});