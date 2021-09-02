import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    getTestCategory,
    ICard,
    IUser,
    prepareCryptocurrencies,
    prepareDb,
    randomCard,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Cryptocurrency, DaoIds, DaoModelNames } from '../src/types/constants';
import { AuthModule } from '../src/auth/auth.module';
import { CardSalesModule } from '../src/cardSales/card-sales.module';
import { ObjectID } from 'mongodb';
import { ICardDocument, ICardLeanDocument } from '../src/cards/schemas/cards.schema';
import { ExchangeService } from '../src/cryptocurrencies/exchange.service';
import { ICardSaleDocument } from '../src/cardSales/schemas/card-sales.schema';
import { SignTypeDataService } from '../src/signTypeData/sign-type-data.service';
import { Errors } from '../src/types/errors';
import { Errors as SaleErrors } from '../src/cardSales/types/errors';
import { FeeMethod, HowToCall, SaleKind, Side } from '../src/blockchain/types/wyvern-exchange/enums';
import { CardSaleDao } from '../src/cardSales/dao/card-sale.dao';
import { BlockchainService } from '../src/blockchain/blockchain.service';

const prepareData = async (
    connection: Connection,
    user: IUser
): Promise<ICard> => {
    const db = connection.db;
    const testCategory = await getTestCategory(db);

    const tokenCollection = db.collection(DaoIds.tokenCollections);
    const resCollection = await tokenCollection.insertOne(randomCollection(user, testCategory));

    const card = randomCard(user, resCollection.ops[0], testCategory, false) as ICardLeanDocument;
    card.hasSale = false;
    card.totalSupply = 10;
    card.balances[0].tokenAmount = 10;
    card._id = new ObjectID('604a35a2d8ec5cfa1b88dad5');

    return (await db.collection(DaoIds.cards).insertOne(card)).ops[0];
}

const tokensCountToSale = 5;
const price = '0.9';
const quote = 1500;
const symbol = Cryptocurrency.eth;

const getBody = () => ({
    "data": {
        "price": price,
        "currency": symbol,
        "tokensCount": 5,
        "publishFrom": new Date(new Date().getTime()),
        "salt": "0x27cde95c447edf5c4d8f7f4927826b5de4414d04d9aa739a150ee981f8f53bce",
        "staticExtraData": "0x"
    },
    "signature": "0x5c5621604bff0fc57bee7da362da65013e617c37320444ef0ce76a185326c6f11a8eae311798ac5e0405a0cd52c17f" +
        "f1528cac490bf0976ef10b3b4da3c498591c"
});

describe('CardSalesController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let defaultHeaders: { Authorization: string };
    let cardSaleModel: Model<ICardSaleDocument>;
    let cardModel: Model<ICardDocument>;
    let server: any;
    let card: ICard;
    let user: IUser;
    let cardId: string;
    let exchangeService: ExchangeService;
    let cardSaleDao: CardSaleDao;
    let blockchainService: BlockchainService;
    let signTypeDataService: SignTypeDataService;

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
        exchangeService = app.get(ExchangeService);
        blockchainService = app.get(BlockchainService);
        signTypeDataService = app.get(SignTypeDataService);
        cardSaleDao = app.get(CardSaleDao);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    describe('cards/:cardId/sales (e2e)', () => {
        beforeEach(async () => {
            const data = await prepareDb(app, dbConnection);
            user = data.user;
            defaultHeaders = { Authorization: `Bearer ${data.token}` };
            card = await prepareData(dbConnection, user);
            cardId = card._id.toString();
            await prepareCryptocurrencies(dbConnection);

            jest.spyOn(blockchainService, 'getCardPutOnSaleHash').mockReturnValue(Promise.resolve({
                order: [
                    [],
                    [],
                    FeeMethod.splitFee,
                    Side.sell,
                    SaleKind.fixedPrice,
                    HowToCall.call,
                    'callDataHex',
                    'replacementPattern',
                    'staticExtraData'
                ],
                orderHash: 'orderHash'
            }));

            jest.spyOn(signTypeDataService, 'checkUserSignatureByEthSign').mockReturnValue(true);

            jest.spyOn(exchangeService, 'getRate').mockReturnValue(Promise.resolve([{
                symbol,
                symbolId: 1027,
                quote
            }]));
        });

        it('/cards/:id/sales should create sale', async () => {
            const body = getBody();

            const card = await cardModel.findById(cardId);
            expect(card.hasSale).toBeFalsy();

            expect(await cardSaleModel.findOne({ cardId })).toBeNull();
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.CREATED);
            const sale = await cardSaleModel.findOne({ cardId });
            expect(sale).toBeDefined();
            expect(sale.cardId.toString()).toBe(cardId);
            expect(sale.userIdAsString).toBe(user._id.toString());
            expect(sale.tokensCount).toBe(tokensCountToSale);
            expect(sale.price.toString()).toBe(price);
            expect(sale.priceUsd).toBe(parseFloat(price) * quote);
            expect(sale.currency.symbol).toBe(symbol);
            expect(sale.signature).toBeDefined();
            expect(sale.signature).toBe(body.signature);

            const updatedCard = await cardModel.findById(cardId);
            expect(updatedCard.hasSale).toBeTruthy();
        });

        it('/cards/:id/sales should return 401 response without access token', async () => {
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .send(getBody())
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/cards/:id/sales should return 404 response with wrong cardId request param', async () => {
            await request(server)
                .post(`/cards/undefined/sales`)
                .set(defaultHeaders)
                .send(getBody())
                .expect(HttpStatus.NOT_FOUND);
        });

        it(
            '/cards/:id/sales should return 403 response with creation a sale of someone else balance',
            async () => {
                await cardModel.findByIdAndUpdate(
                    cardId,
                    {
                        $set: {
                            'balances.$[].userId': '604c8aa28a7508396df72509',
                            'balances.$[].ethAddress': 'ethAddress'
                        }
                    }
                );

                const cardEntity = await cardModel.findById(cardId);
                expect(cardEntity.balances.length).toBe(1);
                expect(user._id.toString() !== cardEntity.balances[0].userId.toString()).toBeTruthy();

                await request(server)
                    .post(`/cards/${cardId}/sales`)
                    .set(defaultHeaders)
                    .send(getBody())
                    .expect(HttpStatus.FORBIDDEN);
            }
        );

        it(
            '/cards/:id/sales should return 400 response with count of tokens that are not enough on the balance',
            async () => {
                const cardEntity = await cardModel.findById(cardId);
                expect(cardEntity.balances.length).toBe(1);
                const body = getBody();
                body.data.tokensCount = cardEntity.balances[0].tokenAmount + 5;
                jest.spyOn(signTypeDataService, 'checkUserSignature').mockReturnValue(true);

                const res = await request(server)
                    .post(`/cards/${cardId}/sales`)
                    .set(defaultHeaders)
                    .send(body)
                    .expect(HttpStatus.BAD_REQUEST);

                expect(res.body).toBeDefined();
                expect(res.body.message).toBe(Errors.NOT_ENOUGH_TOKENS_BALANCE);
            }
        );

        it('/cards/:id/sales should return 400 response with forbidden currency', async () => {
            const body = getBody();
            body.data.currency = 'wrongCurrency' as Cryptocurrency;

            const res = await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res.body).toBeDefined();
            expect(res.body.message).toBe(Errors.WRONG_CURRENCY);
        });

        it('/cards/:id/sales should return 400 response with wrong currency', async () => {
            jest.spyOn(exchangeService, 'getRate').mockReturnValue(Promise.resolve([]));

            const res = await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(getBody())
                .expect(HttpStatus.BAD_REQUEST);

            expect(res.body).toBeDefined();
            expect(res.body.message).toBe(Errors.WRONG_CURRENCY);
        });

        it('/cards/:id/sales should return 400 response with wrong body signature', async () => {
            const body = getBody();
            body.signature = 'wrong_signature';
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response with wrong body data', async () => {
            const reqBody = { ...getBody(), data: 'wrong_data' };
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(reqBody)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response with wrong token price type', async () => {
            const body: any = getBody();
            body.data.price = 'wrongNumber';
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response without token currency', async () => {
            const body = getBody();
            delete body.data.currency;
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response with wrong tokensCount type', async () => {
            const body: any = getBody();
            body.data.tokensCount = '1';
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response with wrong token publishFrom type', async () => {
            const body: any = getBody();
            body.data.publishFrom = 'wrong_data';
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response with wrong token publishTo type', async () => {
            const body: any = getBody();
            body.data.publishTo = 'wrong_data';
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response by wrong checksum address', async () => {
            const body: any = getBody();
            jest.spyOn(signTypeDataService, 'checkUserSignatureByEthSign').mockReturnValue(false);
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 response by old publish from body param', async () => {
            const body: any = getBody();
            body.data.publishFrom = new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000);
            await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/:id/sales should return 400 SALE_DOES_NOT_CREATED if sale doesnt created', async () => {
            const card = await cardModel.findById(cardId);
            expect(card.hasSale).toBeFalsy();

            jest.spyOn(cardSaleDao, 'createSale').mockResolvedValue(null);

            const res = await request(server)
                .post(`/cards/${cardId}/sales`)
                .set(defaultHeaders)
                .send(getBody())
                .expect(HttpStatus.BAD_REQUEST);

            expect(res.body).toBeDefined();
            expect(res.body.message).toBe(SaleErrors.SALE_DOES_NOT_CREATED);

            const updatedCard = await cardModel.findById(cardId);
            expect(updatedCard.hasSale).toBeFalsy();
        });
    });
});
