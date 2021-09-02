import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    createCardSale,
    createRandomUser,
    getTestCategory,
    ICard,
    IUser,
    prepareDb,
    randomCard,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoIds, DaoModelNames } from '../src/types/constants';
import { AuthModule } from '../src/auth/auth.module';
import { CardSalesModule } from '../src/cardSales/card-sales.module';
import { ObjectID } from 'mongodb';
import { ICardDocument, ICardLeanDocument } from '../src/cards/schemas/cards.schema';
import { ICardSaleDocument } from '../src/cardSales/schemas/card-sales.schema';

const prepareData = async (
    connection: Connection,
    user: IUser
): Promise<ICard> => {
    const db = connection.db;
    const testCategory = await getTestCategory(db);

    const tokenCollection = db.collection(DaoIds.tokenCollections);
    const resCollection = await tokenCollection.insertOne(randomCollection(user, testCategory));

    const card = randomCard(user, resCollection.ops[0], testCategory, false) as ICardLeanDocument;
    card.totalSupply = 10;
    card.balances[0].tokenAmount = 10;
    card._id = new ObjectID('604a35a2d8ec5cfa1b88dad5');

    return (await db.collection(DaoIds.cards).insertOne(card)).ops[0];
};


describe('SalesController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let defaultHeaders: { Authorization: string };
    let cardSaleModel: Model<ICardSaleDocument>;
    let cardModel: Model<ICardDocument>;
    let server: any;
    let card: ICard;
    let user: IUser;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, CardSalesModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        cardSaleModel = app.get(getModelToken(DaoModelNames.cardSale));
        cardModel = app.get(getModelToken(DaoModelNames.card));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });


    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
        card = await prepareData(dbConnection, user);
    });

    it('/sales/:saleId should delete sale', async () => {
        const sale = await createCardSale(dbConnection, card._id, user._id, 10);

        const cardEntity = await cardModel.findById(card._id.toString());
        expect(cardEntity.hasSale).toBeTruthy();

        await request(server)
            .delete(`/sales/${sale._id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        expect(await cardSaleModel.findOne({ _id: sale._id })).toBeNull();

        const cardEntityUpdated = await cardModel.findById(card._id.toString());
        expect(cardEntityUpdated.hasSale).toBeFalsy();
    });

    it('/sales/:saleId try to delete not owner', async () => {
        const differentUser = await createRandomUser(dbConnection, { ethAddress: 'ethAddress' });
        const sale = await createCardSale(dbConnection, card._id, differentUser._id, 10);
        await request(server)
            .delete(`/sales/${sale._id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });
});
