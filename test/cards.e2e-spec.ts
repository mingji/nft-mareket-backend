import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    createRandomUser,
    expectPaginatedResponse,
    getCard,
    ICard,
    ITokenCollection,
    IUser,
    prepareDb,
    prepareTokenCollections,
    randomCard,
    randomCollection,
    randomSale,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import * as nodemailer from "nodemailer";
import { TokenCollectionsModule } from '../src/tokenCollections/token-collections.module';
import { DaoModelNames, SortOrder } from '../src/types/constants';
import { CardSortField } from '../src/cards/dao/card.dao';
import { ICategoryLeanDocument } from '../src/categories/schemas/categories.schema';
import { ICardDocument } from '../src/cards/schemas/cards.schema';
import { ICardSaleDocument, ICardSaleLeanDocument } from '../src/cardSales/schemas/card-sales.schema';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import * as faker from 'faker';
import { AuthModule } from '../src/auth/auth.module';
import { Pagination } from '../src/config/types/constants';
import { CardViewersService } from '../src/cardViewers/card-viewers.service';
import { v4 } from 'uuid';
import { SaleStatus } from '../src/cardSales/types/enums';
import { IUserDocument } from '../src/users/schemas/user.schema';

const checkSortingPrice = (res, sortOrder: SortOrder) => {
    expectPaginatedResponse(res);
    const prices = res.body.data.map(card => Math.min(...card.sales.map(sale => sale.priceUsd)));
    for (let i = 1; i < prices.length; i++) {
        if (sortOrder === SortOrder.asc) {
            expect(prices[i - 1]).toBeLessThanOrEqual(prices[i]);
        } else {
            expect(prices[i - 1]).toBeGreaterThanOrEqual(prices[i]);
        }
    }
}

jest.mock("nodemailer", () => ({
    createTransport: () => ({
        sendMail: jest.fn(),
    }),
}));

describe('CardsController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let user: IUser;
    let card: ICard;
    let likedCard: ICard;
    let dislikedCard: ICard;
    let tokenCollection: ITokenCollection;
    let category: ICategoryLeanDocument;
    let sale: ICardSaleLeanDocument;
    let cardViewersService: CardViewersService;
    let server: any;
    let cardModel: Model<ICardDocument>;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let cardSaleModel: Model<ICardSaleDocument>;
    let userModel: Model<IUserDocument>;
    let defaultHeaders: { Authorization: string };

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), TokenCollectionsModule, AuthModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        cardModel = app.get(getModelToken(DaoModelNames.card));
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        cardSaleModel = app.get(getModelToken(DaoModelNames.cardSale));
        userModel = app.get(getModelToken(DaoModelNames.user));
        cardViewersService = app.get(CardViewersService);
    });

    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
        const cardCollection = await getCard(dbConnection, user);
        card = cardCollection.cardEntity;
        tokenCollection = cardCollection.tokenCollectionEntity;
        category = cardCollection.testCategory;
        sale = cardCollection.sale;
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/cards/:cardId should return card data', async () => {
        const res = await request(server).get(`/cards/${card._id}`).expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBeDefined();
        expect(res.body.name).toBe(card.name);
        expect(res.body.file).toBeDefined();
        expect(res.body.file.original).toBeDefined();
        expect(res.body.file.original.extension).toBeDefined();
        expect(res.body.file.original.mimetype).toBeDefined();
    });

    it('/cards/:cardId should return card data with sale contract', async () => {
        const res = await request(server).get(`/cards/${card._id}`).expect(HttpStatus.OK);
        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.tokenCollection.saleContract).toBeDefined();
        expect(res.body.tokenCollection.saleContract.saleContract).toBeDefined();
        expect(res.body.tokenCollection.saleContract.saleContract.length).toBeGreaterThan(0);
        expect(res.body.tokenCollection.saleContract.saleContractProxy).toBeDefined();
        expect(res.body.tokenCollection.saleContract.saleContractProxy.length).toBeGreaterThan(0);
        expect(res.body.tokenCollection.saleContract.allowedCryptocurrencies).toBeDefined();
        expect(res.body.tokenCollection.saleContract.allowedCryptocurrencies).toBeInstanceOf(Array);
        expect(res.body.tokenCollection.saleContract.allowedCryptocurrencies.length).toBeGreaterThan(0);
    });

    it('/cards/:cardId should return 404 with wrong route param cardId', async () => {
        await request(server).get(`/cards/undefined`).expect(HttpStatus.NOT_FOUND);
    });

    it('/cards/:cardId/users/:userId should return card balance data', async () => {
        const res = await request(server).get(`/cards/${card._id}/users/${user._id}`).expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBeDefined();
        expect(res.body.balance).toBeDefined();
        expect(res.body.balance.user.id).toBe(user._id.toString());
        expect(res.body.name).toBe(card.name);
        expect(res.body.file).toBeDefined();
        expect(res.body.file.original).toBeDefined();
        expect(res.body.file.original.extension).toBeDefined();
        expect(res.body.file.original.mimetype).toBeDefined();
    });

    it('/cards/:cardId/users/:userId should return 404 with wrong route param cardId', async () => {
        await request(server).get(`/cards/${card._id}/users/undefined`).expect(HttpStatus.NOT_FOUND);
    });

    it('/cards/:cardId/report should return 201 for correct body', async () => {
        await request(server)
            .post(`/cards/${card._id}/report`)
            .set(defaultHeaders)
            .send({ email: 'test@test.com', message: "Hey everyone!", walletAddress: '123', link: 'test.com/' })
            .expect(HttpStatus.CREATED);
    });

    it ('/cards/:cardId/report should return 400 with incorrect email', async () => {
        await request(server)
            .post(`/cards/${card._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/cards/:cardId/report should return 400 with incorrect wallet address', async () => {
        await request(server)
            .post(`/cards/${card._id}/report`)
            .set(defaultHeaders)
            .send({
                email: 'test@test.com',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/cards/:cardId/report should return 400 with incorrect link', async () => {
        await request(server)
            .post(`/cards/${card._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                email: 'test@test.com'
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/cards/:cardId/users/:userId/sales/:saleId should return card sale data', async () => {
        const userId = sale.userId.toString();
        const res = await request(server)
            .get(`/cards/${card._id}/users/${userId}/sales/${sale._id}`)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBeDefined();
        expect(res.body.sale).toBeDefined();
        expect(res.body.sale.user.id).toBe(userId);
        expect(res.body.name).toBe(card.name);
        expect(res.body.file).toBeDefined();
        expect(res.body.file.original).toBeDefined();
        expect(res.body.file.original.extension).toBeDefined();
        expect(res.body.file.original.mimetype).toBeDefined();
        expect(res.body.sale.signature).toBeDefined();
        expect(res.body.sale.signature.length).toBeGreaterThan(0);
        expect(res.body.sale.order).toBeDefined();
        expect(res.body.sale.orderHash).toBeDefined();
        expect(res.body.sale.orderHash.length).toBeGreaterThan(0);
    });

    it(
        '/cards/:cardId/users/:userId/sales/:saleId should return 404 with wrong route param cardId',
        async () => {
            await request(server)
                .get(`/cards/${card._id}/users/${user._id}/sales/undefined`)
                .expect(HttpStatus.NOT_FOUND);
        }
    );

    it('/cards/:cardId check card listings', async () => {
        const tokenAmount = 10;
        const cardId = card._id;
        const userId = user._id;
        const balances = [{
            userId: user._id,
            tokenAmount,
            balanceId: 'balanceId',
            ethAddress: 'ethAddress'
        }];
        await cardModel.updateOne({_id: cardId}, { balances });
        await cardSaleModel.deleteMany({ cardId, userId });

        const resOnlyBalances = await request(server).get(`/cards/${card._id}`).expect(HttpStatus.OK);
        expect(resOnlyBalances.body).toBeDefined();
        expect(resOnlyBalances.body.id).toBeDefined();
        expect(resOnlyBalances.body.balances).toBeDefined();
        expect(resOnlyBalances.body.balances.length).toBe(balances.length);
        expect(resOnlyBalances.body.balances[0].tokenAmount).toBe(tokenAmount);
        expect(resOnlyBalances.body.sales).toBeDefined();
        expect(resOnlyBalances.body.sales.length).toBe(0);

        const sales = [
            randomSale(cardId, userId, 3),
            randomSale(cardId, userId, 4)
        ];
        let salesTokens = sales.reduce((a, b) => a + b.tokensCount, 0);
        await cardSaleModel.insertMany(sales as ICardSaleDocument[]);
        const resBalancesWithSales = await request(server).get(`/cards/${card._id}`).expect(HttpStatus.OK);
        expect(resBalancesWithSales.body).toBeDefined();
        expect(resBalancesWithSales.body.id).toBeDefined();
        expect(resBalancesWithSales.body.balances).toBeDefined();
        expect(resBalancesWithSales.body.balances.length).toBe(balances.length);
        expect(resBalancesWithSales.body.balances[0].tokenAmount).toBe(tokenAmount - salesTokens);
        expect(resBalancesWithSales.body.sales).toBeDefined();
        expect(resBalancesWithSales.body.sales.length).toBe(sales.length);
        expect(resBalancesWithSales.body.sales.reduce((a, b) => a + b.tokensCount, 0)).toBe(salesTokens);

        sales.push(randomSale(cardId, userId, 3));
        await cardSaleModel.deleteMany({ cardId, userId });
        await cardSaleModel.insertMany(sales as ICardSaleDocument[]);
        salesTokens = sales.reduce((a, b) => a + b.tokensCount, 0);
        expect(salesTokens).toBe(tokenAmount);
        const resOnlySales = await request(server).get(`/cards/${card._id}`).expect(HttpStatus.OK);
        expect(resOnlySales.body).toBeDefined();
        expect(resOnlySales.body.id).toBeDefined();
        expect(resOnlySales.body.balances).toBeDefined();
        expect(resOnlySales.body.balances.length).toBe(0);
        expect(resOnlySales.body.sales).toBeDefined();
        expect(resOnlySales.body.sales.length).toBe(sales.length);
        expect(resOnlySales.body.sales.reduce((a, b) => a + b.tokensCount, 0)).toBe(salesTokens);
    });

    it('/cards/:cardId should return 200 and increase card viewers count', async () => {
        expect(await cardViewersService.existViewer(card._id, user._id)).toBeFalsy();

        await request(server)
            .get(`/cards/${card._id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(await cardViewersService.existViewer(card._id, user._id)).toBeTruthy();

        const cardFresh = await cardModel.findById(card._id);
        expect(cardFresh.viewersCount).toBe(card.viewersCount + 1);
    });

    it('/cards/:cardId should return 200 and doesnt increase viewers if exist viewer', async () => {
        jest.spyOn(cardViewersService, 'existViewer').mockResolvedValue(true);

        await request(server)
            .get(`/cards/${card._id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        const cardFresh = await cardModel.findById(card._id);
        expect(cardFresh.viewersCount).toBe(card.viewersCount);
    });

    it('/cards/:cardId should return 200 and doesnt increase viewers without access token', async () => {
        await request(server)
            .get(`/cards/${card._id}`)
            .expect(HttpStatus.OK);

        const cardFresh = await cardModel.findById(card._id);
        expect(cardFresh.viewersCount).toBe(card.viewersCount);
    });

    describe('Cards liking feature (e2e)', () => {
        beforeEach(async () => {
            const { cardEntity: likedCardEntity } = await getCard(dbConnection, user, true);
            likedCard = likedCardEntity;
            const { cardEntity: dislikedCardEntity } = await getCard(dbConnection, user, false);
            dislikedCard = dislikedCardEntity;
        });

        afterEach(async () => {
            await clearDb(dbConnection);
            jest.restoreAllMocks();
        });

        it('/cards/:cardId should return card data with like info for authenticated user', async () => {
            const res = await request(server)
                .get(`/cards/${likedCard._id}`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.likesAmount).toEqual(1);
            expect(res.body.isLiked).toBeTruthy();
        });

        it('/cards/:cardId should return card data with dislike info for authenticated user', async () => {
            const res = await request(server)
                .get(`/cards/${dislikedCard._id}`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.dislikesAmount).toEqual(1);
            expect(res.body.isLiked).toBeFalsy();
        });

        it('/cards/:cardId/like should add userId to likes array', async () => {
            await request(server)
                .put(`/cards/${card._id}/like`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh = await cardModel.findById(card._id);
            expect(cardFresh.likes).toContainEqual(user._id);
        });

        it('/cards/:cardId/like should throw a 404 for non-existing card', async () => {
            await request(server)
                .put('/cards/60c1d60efb6015563e5dfff9/like')
                .set(defaultHeaders)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('/cards/:cardId/like should throw 401 for non-authorized user', async () => {
            await request(server)
                .put(`/cards/${card._id}/like`)
                .expect(HttpStatus.UNAUTHORIZED)
        });

        it('/cards/:cardId/dislike should add userId to dislikes array', async () => {
            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh = await cardModel.findById(card._id);

            expect(cardFresh.dislikes).toContainEqual(user._id);
        })

        it('/cards/:cardId/dislike should throw a 404 for non-existing card', async () => {
            await request(server)
                .put('/cards/60c1d60efb6015563e5dfff9/dislike')
                .set(defaultHeaders)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('/cards/:cardId/dislike should throw 401 for non-authorized user', async () => {
            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/cards/:cardId/like should toggle likes', async () => {
            await request(server)
                .put(`/cards/${card._id}/like`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh = await cardModel.findById(card._id);
            expect(cardFresh.likes).toContainEqual(user._id);

            await request(server)
                .put(`/cards/${card._id}/like`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh2 = await cardModel.findById(card._id);
            expect(cardFresh2.likes).not.toContainEqual(user._id);
        });

        it('/cards/:cardId/dislike should toggle dislikes', async () => {
            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh = await cardModel.findById(card._id);
            expect(cardFresh.dislikes).toContainEqual(user._id);

            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const cardFresh2 = await cardModel.findById(card._id);
            expect(cardFresh2.dislikes).not.toContainEqual(user._id);
        });

        it('/cards/:cardId/dislike should remove userId from likes array', async() => {
            await request(server)
                .put(`/cards/${card._id}/like`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const freshCard = await cardModel.findById(card._id);

            expect(freshCard.likes).toContainEqual(user._id);

            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const freshCard2 = await cardModel.findById(card._id);

            expect(freshCard2.likes).not.toContainEqual(user._id);
            expect(freshCard2.dislikes).toContainEqual(user._id);
        })

        it('/cards/:cardId/like should remove userId from dislikes array', async() => {
            await request(server)
                .put(`/cards/${card._id}/dislike`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const freshCard = await cardModel.findById(card._id);

            expect(freshCard.dislikes).toContainEqual(user._id);

            await request(server)
                .put(`/cards/${card._id}/like`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const freshCard2 = await cardModel.findById(card._id);

            expect(freshCard2.dislikes).not.toContainEqual(user._id);
            expect(freshCard2.likes).toContainEqual(user._id);
        });

        it('/cards should return a list of liked cards', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({ userId: user._id.toString(), likedBy: user._id.toString() })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(res.body.data.length).toEqual(1);
        });
    });

    describe('Cards list (e2e)', () => {
        beforeEach(async () => {
            await prepareTokenCollections(dbConnection, user);
        });

        afterEach(async () => {
            await clearDb(dbConnection);
            jest.restoreAllMocks();
        });

        it('/cards/ should return list of cards', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({ limit: 10 })
                .expect(HttpStatus.OK);
            expectPaginatedResponse(res);
            res.body.data.map(card => {
                expect(card.id).toBeDefined();
                expect(card.id.length).toBeGreaterThan(0);
                expect(card.image).toBeDefined();
                expect(card.image.location).toBeDefined();
            });
        });

        it('/cards/ should return 200 by correct sortOrder query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ sortOrder: SortOrder.asc })
                .expect(HttpStatus.OK);
        });

        it('/cards/ should return 400 by wrong sortOrder query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ sortOrder: 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/ should return 200 by correct sortField query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ sortField: CardSortField.id })
                .expect(HttpStatus.OK);
        });

        it('/cards/ should return 400 by wrong sortField query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ sortField: 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/ should return 200 by correct collections ids query filter', async () => {
            const collectionId = tokenCollection._id.toString();
            const res = await request(server)
                .get(`/cards/`)
                .query({ 'collections[0]': collectionId })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            expect(res.body.data[0].tokenCollection.id).toBe(collectionId);
        });

        it('/cards/ should return 400 by wrong collections ids query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ 'collections[0]': 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
            await request(server)
                .get(`/cards/`)
                .query({ collections: 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/ should return 200 by correct property query filter', async () => {
            const cardId = card._id.toString();
            const res = await request(server)
                .get(`/cards/`)
                .query({
                    propertyName: card.properties[0].property,
                    propertyValue: card.properties[0].value })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            const resCard = res.body.data.find(resCard => resCard.id === cardId);
            expect(resCard).toBeDefined();
            expect(resCard.id).toBe(cardId);
        });

        it('/cards/ should return 400 by wrong property query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ propertyName: 'testName' })
                .expect(HttpStatus.BAD_REQUEST);
            await request(server)
                .get(`/cards/`)
                .query({ propertyValue: 'testValue' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/ should return 200 by correct categories ids query filter', async () => {
            const categoryId = category._id.toString();
            const res = await request(server)
                .get(`/cards/`)
                .query({ 'categories[0]': categoryId })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            expect(res.body.data[0].categoryId).toBe(categoryId);
        });

        it('/cards/ should return 400 by wrong categories ids query filter', async () => {
            await request(server)
                .get(`/cards/`)
                .query({ 'categories[0]': 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
            await request(server)
                .get(`/cards/`)
                .query({ categories: 'undefined' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/cards/ should return 200 by sorting price', async () => {
            const sortPriceAsc = await request(server)
                .get(`/cards/`)
                .query({ sortField: 'price', sortOrder: SortOrder.asc, limit: 5 })
                .expect(HttpStatus.OK);
            checkSortingPrice(sortPriceAsc, SortOrder.asc);

            const sortPriceDesc = await request(server)
                .get(`/cards/`)
                .query({ sortField: 'price', sortOrder: SortOrder.desc, limit: 5 })
                .expect(HttpStatus.OK);
            checkSortingPrice(sortPriceDesc, SortOrder.desc);

            const sortPriceOffsetAsc = await request(server)
                .get(`/cards/`)
                .query({ sortField: 'price', sortOrder: SortOrder.asc, limit: 5, offset: 5 })
                .expect(HttpStatus.OK);
            checkSortingPrice(sortPriceOffsetAsc, SortOrder.asc);

            const sortPriceOffsetDesc = await request(server)
                .get(`/cards/`)
                .query({ sortField: 'price', sortOrder: SortOrder.desc, limit: 5, offset: 5 })
                .expect(HttpStatus.OK);
            checkSortingPrice(sortPriceOffsetDesc, SortOrder.desc);
        });

        it('/cards/ should return 200 by correct sale query filter', async () => {
            const cardId = card._id.toString();
            const resPublished = await request(server)
                .get(`/cards/`)
                .query({ sale: true, limit: 50 })
                .expect(HttpStatus.OK);
            expectPaginatedResponse(resPublished);
            expect(resPublished.body.data[0]).toBeDefined();
            let resCard = resPublished.body.data.find(resCard => resCard.id === cardId);
            expect(resCard).toBeDefined();
            expect(resCard.id).toBe(cardId);

            await cardModel.findOneAndUpdate({ _id: cardId }, { 'hasSale': false });
            const resUnpublished = await request(server)
                .get(`/cards/`)
                .query({ sale: false, limit: 50 })
                .expect(HttpStatus.OK);
            expectPaginatedResponse(resUnpublished);
            expect(resUnpublished.body.data[0]).toBeDefined();
            resCard = resUnpublished.body.data.find(resCard => resCard.id === cardId);
            expect(resCard).toBeDefined();
            expect(resCard.id).toBe(cardId);
        });

        it('/cards/ should return 200 by sorting price and filters', async () => {
            const tokenCollection = await tokenCollectionModel.create(randomCollection(user, category));

            const cardsData = [];
            for (let i = 0; i < 20; i++) {
                cardsData.push(randomCard(user, { _id: tokenCollection.id }, category));
            }
            const resCards = await cardModel.insertMany(cardsData);
            const salesData = [];
            resCards.map(card => {
                if (card.hasSale) {
                    salesData.push(randomSale(
                        card.id,
                        user._id,
                        1,
                        faker.random.number({ min: 1, max: 50 })
                    ))
                }
            });
            await cardSaleModel.insertMany(salesData);

            const expectRes = (res, sortOrder: SortOrder) => {
                expectPaginatedResponse(res);
                expect(res.body.data.length).toBeLessThanOrEqual(salesData.length);
                expect(res.body.total).toBe(salesData.length);
                checkSortingPrice(res, sortOrder);
                res.body.data.map(item => expect(item.tokenCollection.id).toBe(tokenCollection.id));
            }

            const resAsc = await request(server)
                .get(`/cards/`)
                .query({
                    sortField: 'price',
                    sortOrder: SortOrder.asc,
                    limit: 50,
                    'collections[0]': tokenCollection.id
                })
                .expect(HttpStatus.OK);
            expectRes(resAsc, SortOrder.asc);

            const resDesc = await request(server)
                .get(`/cards/`)
                .query({
                    sortField: 'price',
                    sortOrder: SortOrder.desc,
                    limit: 50,
                    'collections[0]': tokenCollection.id
                })
                .expect(HttpStatus.OK);
            expectRes(resDesc, SortOrder.desc);
        });

        it('/cards/ should return priceUds 0 if sale priceUsd 0', async () => {
            const cardId = card._id.toString();
            await cardSaleModel.updateMany({ cardId }, { priceUsd: 0, price: 0 });

            const res = await request(server)
                .get(`/cards/`)
                .query({ sale: true, limit: 50 })
                .expect(HttpStatus.OK);
            expectPaginatedResponse(res);

            const resCard = res.body.data.find(resCard => resCard.id === cardId);
            expect(resCard).toBeDefined();
            expect(resCard.id).toBe(cardId);
            resCard.sales.map(sale => {
                expect(sale.price).toBe('0');
                expect(sale.priceUsd).toBe(0);
            });
        });

        it('/cards/ should return cards by owner', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({ userId: user._id.toString() })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            const userCards = await cardModel.find({ 'balances.userId': user._id });
            const userCardsIds = userCards.map(card => card.id);

            expect(res.body.data.length).toBe(userCards.length);
            expect(res.body.total).toBe(userCards.length);
            res.body.data.forEach(resCard => expect(userCardsIds.includes(resCard.id)).toBeTruthy());
        });

        it('/cards/ should return created by user', async () => {
            const randomUser = await createRandomUser(dbConnection, { ethAddress: 'ethAddress' });
            const cards = [];
            for (let i = 0; i < 10; i++) {
                cards.push(randomCard(randomUser, tokenCollection, category, false));
            }
            await cardModel.insertMany(cards);
            const res = await request(server)
                .get(`/cards/`)
                .query({ createdBy: user._id.toString() })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);
            expectPaginatedResponse(res);
            const userCards = await cardModel.find({ 'creator': user._id });
            const userCardsIds = userCards.map(card => card.id);
            expect(res.body.total).toBe(userCards.length);
            res.body.data.forEach(resCard => expect(userCardsIds.includes(resCard.id)).toBeTruthy());
        });

        it('/cards/ should return created by user sortedByPrice', async () => {
            const randomUser = await createRandomUser(dbConnection, { ethAddress: 'ethAddress' });
            const cards = [];
            for (let i = 0; i < 10; i++) {
                cards.push(randomCard(randomUser, tokenCollection, category, false));
            }
            await cardModel.insertMany(cards);
            const res = await request(server)
                .get(`/cards/`)
                .query({ createdBy: user._id.toString(), sortField: CardSortField.price })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);
            expectPaginatedResponse(res);

            const userCards = await cardModel.find({ creator: user._id, hasSale: true });
            const userCardsIds = userCards.map(card => card.id);

            expect(res.body.total).toBe(userCards.length);
            res.body.data.forEach(resCard => expect(userCardsIds.includes(resCard.id)).toBeTruthy());
        });

        it('/cards/ should return fixed items count without set limit', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({})
                .set(defaultHeaders)
                .expect(HttpStatus.OK);
            expectPaginatedResponse(res);
            expect(res.body.data.length).toEqual(Pagination.ITEMS_PER_PAGE);
        });

        it('/cards/ should return cards by owner sorting by price', async () => {
            await cardSaleModel.deleteMany({ userId: user._id });
            await cardModel.deleteMany({ 'balances.userId': user._id });

            const cards = [];
            for (let i = 0; i < 10; i++) {
                cards.push(randomCard(user, tokenCollection, category, false));
            }
            const cardInstances = await cardModel.insertMany(cards);

            const sales = [];
            cardInstances.forEach(card => sales.push(randomSale(
                card.id.toString(),
                user._id.toString(),
                1,
                faker.random.number({ min: 1, max: 50 })
            )));
            await cardSaleModel.insertMany(sales);

            const sortOrder = SortOrder.asc;
            const res = await request(server)
                .get(`/cards/`)
                .query({ userId: user._id.toString(), sortField: 'price', sortOrder })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            const userSales = await cardSaleModel.find({ userId: user._id });
            const userCardsIds = userSales.map(sale => sale.cardId.toString());

            expect(res.body.data.length).toBe(userSales.length);
            expect(res.body.total).toBe(userSales.length);
            res.body.data.forEach(resCard => expect(userCardsIds.includes(resCard.id)).toBeTruthy());
            checkSortingPrice(res, sortOrder);
        });

        it('/cards/ should return 200 by sorting viewersCount asc', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({ sortField: CardSortField.viewersCount, sortOrder: SortOrder.asc, limit: 5 })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            const cardInstances = await cardModel.find({ _id: { $in: res.body.data.map(c => c.id) } });
            const data = {};
            cardInstances.forEach(c => data[c.id] = c);

            const resCards = res.body.data;
            for (let i = 1; i < res.body.data.length; i++) {
                expect(data[resCards[i - 1].id].viewersCount).toBeLessThanOrEqual(data[resCards[i].id].viewersCount);
            }
        });

        it('/cards/ should return 200 by sorting viewersCount desc', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .query({ sortField: CardSortField.viewersCount, sortOrder: SortOrder.desc, limit: 5 })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            const cardInstances = await cardModel.find({ _id: { $in: res.body.data.map(c => c.id) } });
            const data = {};
            cardInstances.forEach(c => data[c.id] = c);

            const resCards = res.body.data;
            for (let i = 1; i < res.body.data.length; i++) {
                expect(data[resCards[i - 1].id].viewersCount).toBeGreaterThanOrEqual(data[resCards[i].id].viewersCount);
            }
        });

        it('/cards/ should return 200 by search', async () => {
            const search = `${v4()}`;
            const card = randomCard(
                user,
                tokenCollection,
                { _id: '6040f7db9f8f86d70bc97993' } as any,
                false
            );
            card.name = `test ${search} card`;
            const cardsInstance = await cardModel.create(card);

            const res = await request(server)
                .get(`/cards/`)
                .query({ search })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            expect(res.body.data.length).toBe(1);

            const searchCard = res.body.data.find(c => c.name === cardsInstance.name);
            expect(searchCard).toBeDefined();
            expect(searchCard.id).toBeDefined();
            expect(searchCard.id).toBe(cardsInstance.id);
        });

        it('/cards/ should return cards without sold sales', async () => {
            const cardId = card._id.toString();
            const cardName = `${card.name}-${v4()}`

            await cardModel.findByIdAndUpdate(cardId, { name: cardName });
            await cardSaleModel.updateMany({ cardId }, { status: SaleStatus.sold });

            const res = await request(server)
                .get(`/cards/`)
                .query({ search: cardName })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            expect(res.body.data.length).toBe(1);

            const searchCard = res.body.data.find(c => c.name === cardName);
            expect(searchCard).toBeDefined();
            expect(searchCard.id).toBeDefined();
            expect(searchCard.id).toBe(cardId);
            expect(searchCard.sales).toBeDefined();
            expect(searchCard.sales.length).toBe(0);
        });

        it('/cards/ should return user cards on sale', async () => {
            const user1 = await userModel.create({ ethAddress: 'test1' });
            const user2 = await userModel.create({ ethAddress: 'test2' });

            const cardsBalances = [
                {
                    userId: user1.id,
                    tokenAmount: 1,
                    ethAddress: user1.ethAddress,
                    balanceId: 'balanceId'
                },
                {
                    userId: user2.id,
                    tokenAmount: 1,
                    ethAddress: user2.ethAddress,
                    balanceId: 'balanceId'
                }
            ];

            const card1 = randomCard(
                user,
                tokenCollection,
                { _id: '6040f7db9f8f86d70bc97993' } as any,
                false
            );
            card1.hasSale = true;
            card1.balances = cardsBalances;
            const cardsInstance1 = await cardModel.create(card1);
            const cardSale1 = randomSale(cardsInstance1._id, user1._id, 1);

            const card2 = randomCard(
                user,
                tokenCollection,
                { _id: '6040f7db9f8f86d70bc97993' } as any,
                false
            );
            card2.hasSale = true;
            card2.balances = cardsBalances;
            const cardsInstance2 = await cardModel.create(card2);
            const cardSale2 = randomSale(cardsInstance2._id, user2._id, 1);

            await cardSaleModel.collection.insertMany([cardSale1, cardSale2]);

            const res = await request(server)
                .get(`/cards/`)
                .query({
                    userId: user1.id,
                    sortField: CardSortField.price
                })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].id).toBeDefined();
            expect(res.body.data[0].id).toBe(cardsInstance1.id);
            expect(res.body.total).toBe(1);
        });

        it('/cards/ should return user cards with his balance data', async () => {
            const user1 = await userModel.create({ ethAddress: 'test1' });
            const user2 = await userModel.create({ ethAddress: 'test2' });

            const cardsBalances = [
                {
                    userId: user1.id,
                    tokenAmount: 3,
                    ethAddress: user1.ethAddress,
                    balanceId: 'balanceId'
                },
                {
                    userId: user2.id,
                    tokenAmount: 2,
                    ethAddress: user2.ethAddress,
                    balanceId: 'balanceId'
                }
            ];

            const card1 = randomCard(
                user,
                tokenCollection,
                { _id: '6040f7db9f8f86d70bc97993' } as any,
                false
            );
            card1.balances = cardsBalances;
            const cardEntity1 = await cardModel.create(card1);

            const card2 = randomCard(
                user,
                tokenCollection,
                { _id: '6040f7db9f8f86d70bc97993' } as any,
                false
            );
            card2.balances = cardsBalances;
            const cardEntity2 = await cardModel.create(card2);

            const res = await request(server)
                .get(`/cards/`)
                .query({ userId: user1.id })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            const checkUserTokenAmount = cardsBalances.find(b => b.userId === user1.id).tokenAmount;

            expect(res.body.data.length).toBe(2);
            const checkCard1 = res.body.data.find(c => c.id === cardEntity1.id);
            expect(checkCard1.balance).toBeDefined();
            expect(checkCard1.balance.tokenAmount).toBeDefined();
            expect(checkCard1.balance.tokenAmount).toBe(checkUserTokenAmount);
            const checkCard2 = res.body.data.find(c => c.id === cardEntity2.id);
            expect(checkCard2.balance).toBeDefined();
            expect(checkCard2.balance.tokenAmount).toBeDefined();
            expect(checkCard2.balance.tokenAmount).toBe(checkUserTokenAmount);
        });

        it('/cards/ should return cards with token collections chain info', async () => {
            const res = await request(server)
                .get(`/cards/`)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            res.body.data.forEach(card => {
                expect(card.tokenCollection).toBeDefined();
                expect(card.tokenCollection.id).toBeDefined();
                expect(card.tokenCollection.id.length).toBeGreaterThan(0);
                expect(card.tokenCollection.name).toBeDefined();
                expect(card.tokenCollection.name.length).toBeGreaterThan(0);
                expect(card.tokenCollection.logo).toBeDefined();
                expect(card.tokenCollection.logo.location.length).toBeGreaterThan(0);
                expect(card.tokenCollection.saleContract).toBeDefined();
                expect(card.tokenCollection.saleContract.saleContract).toBeDefined();
                expect(card.tokenCollection.saleContract.saleContract.length).toBeGreaterThan(0);
                expect(card.tokenCollection.saleContract.saleContractProxy).toBeDefined();
                expect(card.tokenCollection.saleContract.saleContractProxy.length).toBeGreaterThan(0);
                expect(card.chainInfo).toBeDefined();
                expect(card.chainInfo.address).toBeDefined();
                expect(card.chainInfo.address.length).toBeGreaterThan(0);
                expect(card.chainInfo.tokenId).toBeDefined();
                expect(card.chainInfo.tokenId).toBeGreaterThanOrEqual(1);
                expect(card.chainInfo.blockchain).toBeDefined();
                expect(card.chainInfo.blockchain.length).toBeGreaterThan(0);
            });
        });

        describe('Cards has sale with user (e2e)', () => {
            let user1: IUserDocument;
            let user2: IUserDocument;

            beforeEach(async () => {
                user1 = await userModel.create({ ethAddress: 'test1' });
                user2 = await userModel.create({ ethAddress: 'test2' });

                const cardsBalances = [
                    {
                        userId: user1.id,
                        tokenAmount: 1,
                        ethAddress: user1.ethAddress,
                        balanceId: 'balanceId'
                    },
                    {
                        userId: user2.id,
                        tokenAmount: 1,
                        ethAddress: user2.ethAddress,
                        balanceId: 'balanceId'
                    }
                ];

                const getCardSale = async (maker: IUserDocument, viewersCount: number) => {
                    const card = randomCard(
                        user,
                        tokenCollection,
                        { _id: '6040f7db9f8f86d70bc97993' } as any,
                        false
                    );
                    card.hasSale = true;
                    card.balances = cardsBalances;
                    card.viewersCount = viewersCount;
                    const cardsInstance = await cardModel.create(card);
                    return randomSale(cardsInstance._id, maker._id, 1);
                }

                const sales = [];

                for (let i = 1; i <= 10; i++) {
                    sales.push(await getCardSale(user1, i));
                }

                for (let i = 1; i <= 10; i++) {
                    sales.push(await getCardSale(user2, i));
                }

                await cardSaleModel.collection.insertMany(sales);
            });

            it('/cards/ should return cards on sale and sort by desc viewersCount', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.viewersCount,
                        sortOrder: SortOrder.desc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                const checkCards = await cardModel.find({ _id: { $in: checkData.map(c => c.cardId) } });
                expect(checkCards).toBeDefined();
                expect(checkCards.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 1; i < res.body.data.length; i++) {
                    const existCard = checkData.find(c => c.cardId.toString() === res.body.data[i - 1].id);
                    expect(existCard).toBeDefined();
                    expect(existCard.id).toBeDefined();
                    expect(existCard.id.length).toBeGreaterThan(0);
                    const card = checkCards.find(c => c.id === res.body.data[i - 1].id);
                    const nextCard = checkCards.find(c => c.id === res.body.data[i].id);
                    expect(card.viewersCount).toBeGreaterThan(nextCard.viewersCount);
                }
            });

            it('/cards/ should return cards on sale and sort by asc viewersCount', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.viewersCount,
                        sortOrder: SortOrder.asc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                const checkCards = await cardModel.find({ _id: { $in: checkData.map(c => c.cardId) } });
                expect(checkCards).toBeDefined();
                expect(checkCards.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 1; i < res.body.data.length; i++) {
                    const existCard = checkData.find(c => c.cardId.toString() === res.body.data[i - 1].id);
                    expect(existCard).toBeDefined();
                    expect(existCard.id).toBeDefined();
                    expect(existCard.id.length).toBeGreaterThan(0);
                    const card = checkCards.find(c => c.id === res.body.data[i - 1].id);
                    const nextCard = checkCards.find(c => c.id === res.body.data[i].id);
                    expect(card.viewersCount).toBeLessThan(nextCard.viewersCount);
                }
            });

            it('/cards/ should return cards on sale and sort by desc id', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.id,
                        sortOrder: SortOrder.asc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                const checkCards = await cardModel
                    .find({ _id: { $in: checkData.map(c => c.cardId) } })
                    .sort({ _id: 1 });
                expect(checkCards).toBeDefined();
                expect(checkCards.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 0; i < res.body.data.length; i++) {
                    const existCard = checkData.find(c => c.cardId.toString() === res.body.data[i].id);
                    expect(existCard).toBeDefined();
                    expect(existCard.id).toBeDefined();
                    expect(existCard.id.length).toBeGreaterThan(0);
                    expect(res.body.data[i].id).toBe(checkCards[i].id)
                }
            });

            it('/cards/ should return cards on sale and sort by asc id', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.id,
                        sortOrder: SortOrder.desc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                const checkCards = await cardModel
                    .find({ _id: { $in: checkData.map(c => c.cardId) } })
                    .sort({ _id: -1 });
                expect(checkCards).toBeDefined();
                expect(checkCards.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 0; i < res.body.data.length; i++) {
                    const existCard = checkData.find(c => c.cardId.toString() === res.body.data[i].id);
                    expect(existCard).toBeDefined();
                    expect(existCard.id).toBeDefined();
                    expect(existCard.id.length).toBeGreaterThan(0);
                    expect(res.body.data[i].id).toBe(checkCards[i].id)
                }
            });

            it('/cards/ should return cards on sale and sort by desc price', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.price,
                        sortOrder: SortOrder.desc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                expect(checkData).toBeDefined();
                expect(checkData.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 1; i < res.body.data.length; i++) {
                    const card = checkData.find(c => c.cardId.toString() === res.body.data[i - 1].id);
                    const nextCard = checkData.find(c => c.cardId.toString() === res.body.data[i].id);
                    expect(card).toBeDefined();
                    expect(card.id).toBeDefined();
                    expect(card.id.length).toBeGreaterThan(0);
                    expect(nextCard).toBeDefined();
                    expect(nextCard.id).toBeDefined();
                    expect(nextCard.id.length).toBeGreaterThan(0);
                    expect(card.bnPrice.toNumber()).toBeGreaterThanOrEqual(nextCard.bnPrice.toNumber());
                }
            });

            it('/cards/ should return cards on sale and sort by asc price', async () => {
                const res = await request(server)
                    .get(`/cards/`)
                    .query({
                        sale: true,
                        userId: user1.id,
                        sortField: CardSortField.price,
                        sortOrder: SortOrder.asc,
                    })
                    .expect(HttpStatus.OK);

                expectPaginatedResponse(res);

                const checkData = await cardSaleModel.find({ userId: user1.id });
                expect(checkData).toBeDefined();
                expect(checkData.length).toBeGreaterThan(0);

                expect(res.body.total).toBe(checkData.length);
                for (let i = 1; i < res.body.data.length; i++) {
                    const card = checkData.find(c => c.cardId.toString() === res.body.data[i - 1].id);
                    const nextCard = checkData.find(c => c.cardId.toString() === res.body.data[i].id);
                    expect(card).toBeDefined();
                    expect(card.id).toBeDefined();
                    expect(card.id.length).toBeGreaterThan(0);
                    expect(nextCard).toBeDefined();
                    expect(nextCard.id).toBeDefined();
                    expect(nextCard.id.length).toBeGreaterThan(0);
                    expect(card.bnPrice.toNumber()).toBeLessThanOrEqual(nextCard.bnPrice.toNumber());
                }
            });
        });
    });
});
