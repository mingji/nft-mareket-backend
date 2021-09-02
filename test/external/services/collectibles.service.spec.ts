import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    shutdownTest
} from '../../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ExternalModule } from '../../../src/external/external.module';
import { CollectiblesService } from '../../../src/external/collectibles/collectibles.service';
import { ICollectibleDocument } from '../../../src/external/collectibles/schemas/collectible.schema';
import { DaoModelNames } from '../../../src/types/constants';
import { ObjectID } from 'mongodb';

describe('CollectiblesService', () => {
    let app: TestingModule;
    let dbConnection: Connection;
    let collectiblesService: CollectiblesService;
    let collectibleModel: Model<ICollectibleDocument>;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), ExternalModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        collectiblesService = app.get(CollectiblesService);
        collectibleModel = app.get(getModelToken(DaoModelNames.externalCollectible));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(collectiblesService).toBeDefined();
    });

    it('[storeCollectible] should store external collectible in db', async () => {
        const data = await collectibleModel.find();
        expect(data.length).toBe(0);

        const
            clientId = new ObjectID().toString(),
            tokenMetadataId = new ObjectID().toString(),
            externalCollectibleId = 'externalCollectibleId',
            externalStoreId = 'externalStoreId',
            externalCreatorId = 'externalCreatorId',
            externalCreatorEmail = 'externalCreatorEmail@gmail.com',
            maxSupply = 10;

        await collectiblesService.storeCollectible(
            clientId,
            tokenMetadataId,
            maxSupply,
            externalCollectibleId,
            externalCreatorId,
            externalCreatorEmail,
            externalStoreId
        );

        const checkData = await collectibleModel.find();
        expect(checkData.length).toBe(1);

        const [collectible] = checkData;
        expect(collectible).toBeDefined();
        expect(collectible.id).toBeDefined();
        expect(collectible.id.length).toBeGreaterThan(0);
        expect(collectible.clientId).toBeDefined();
        expect(collectible.clientId.toString()).toBe(clientId);
        expect(collectible.externalCollectibleId).toBeDefined();
        expect(collectible.externalCollectibleId).toBe(externalCollectibleId);
        expect(collectible.externalCreatorId).toBeDefined();
        expect(collectible.externalCreatorId).toBe(externalCreatorId);
        expect(collectible.externalCreatorEmail).toBeDefined();
        expect(collectible.externalCreatorEmail).toBe(externalCreatorEmail);
        expect(collectible.maxSupply).toBeDefined();
        expect(collectible.maxSupply).toBe(maxSupply);
        expect(collectible.distributedCount).toBeDefined();
        expect(collectible.distributedCount).toBe(0);
        expect(collectible.tokenMetadataId).toBeDefined();
        expect(collectible.tokenMetadataId.toString()).toBe(tokenMetadataId);
    });

    it('[existsCollectible] should true', async () => {
        const clientId = new ObjectID(), externalCollectibleId = 'externalCollectibleId';

        await collectibleModel.collection.insertOne({ clientId, externalCollectibleId });

        const check = await collectiblesService.existsCollectible(clientId.toString(), externalCollectibleId);
        expect(check).toBeTruthy();
    });

    it('[existsCollectible] should false', async () => {
        const clientId = new ObjectID().toString(), externalCollectibleId = 'externalCollectibleId';

        const check = await collectiblesService.existsCollectible(clientId, externalCollectibleId);
        expect(check).toBeFalsy();
    });
});