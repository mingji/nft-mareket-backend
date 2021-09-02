import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    prepareTokenCollections,
    randomCard,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../src/types/constants';
import { SearchModule } from '../src/search/search.module';
import { ICardDocument } from '../src/cards/schemas/cards.schema';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import { v4 } from 'uuid';

describe('SearchController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let cardModel: Model<ICardDocument>;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let server: any;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), SearchModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        cardModel = app.get(getModelToken(DaoModelNames.card));
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
    });

    beforeEach(async () => {
        await prepareTokenCollections(
            dbConnection,
            { _id: '6040f7db9f8f86d70bc97993', ethAddress: 'ethAddress' } as any
        );
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/search should return collections and cards', async () => {
        const search = `${v4()}`;
        const card = randomCard(
            { _id: '6040f7db9f8f86d70bc97993', ethAddress: 'ethAddress' } as any,
            { _id: '6040f7db9f8f86d70bc97993' },
            { _id: '6040f7db9f8f86d70bc97993' } as any,
            false
        );
        card.name = `test ${search} card`;
        const cardsInstance = await cardModel.create(card);

        const tokenCollection = randomCollection(
            {_id: '606dd633253a047743e28838'} as any,
            {_id: '606dd633253a047743e28838'} as any
        );
        tokenCollection.name = `test ${search} collection`;
        const tokenCollectionInstance = await tokenCollectionModel.create(tokenCollection);

        const res = await request(server)
            .get(`/search`)
            .query({ name: search })
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.collections).toBeDefined();
        const searchCollection = res.body.collections.find(c => c.name === tokenCollectionInstance.name);
        expect(searchCollection).toBeDefined();
        expect(searchCollection.id).toBeDefined();
        expect(searchCollection.id.length).toBeGreaterThan(0);
        expect(res.body.cards).toBeDefined();
        const searchCard = res.body.cards.find(c => c.name === cardsInstance.name);
        expect(searchCard).toBeDefined();
        expect(searchCard.id).toBeDefined();
        expect(searchCard.id.length).toBeGreaterThan(0);
    });

    it('/search should return empty collections and cards', async () => {
        const res = await request(server)
            .get(`/search`)
            .query({ name: v4() })
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.collections).toBeDefined();
        expect(res.body.collections.length).toBe(0);
        expect(res.body.cards).toBeDefined();
        expect(res.body.cards.length).toBe(0);
    });
});
