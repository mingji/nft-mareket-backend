import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    clearDb,
    createApp,
    shutdownTest,
    prepareCategories,
    expectArrayResponse,
    baseAppProviders,
    expectPaginatedResponse, randomCollection
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { CategoriesModule } from '../src/categories/categories.module';
import { ICategoryDocument, ICategoryLeanDocument } from '../src/categories/schemas/categories.schema';
import { TokenCollectionsModule } from '../src/tokenCollections/token-collections.module';
import { CategoryDao } from '../src/categories/dao/category.dao';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import { DaoModelNames } from '../src/types/constants';
import { ObjectID } from 'mongodb';

describe('Categories (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let categories: Array<ICategoryLeanDocument>;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let categoryModel: Model<ICategoryDocument>;
    let server;
    
    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), CategoriesModule, TokenCollectionsModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        categoryModel = app.get(getModelToken(DaoModelNames.category));
    });

    beforeEach(async () => {
        categories = await prepareCategories(dbConnection);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/categories should return all categories', async () => {
        const res = await request(server).get(`/categories`).expect(HttpStatus.OK);
        expectArrayResponse(res);
        expect(res.body.total).toBe(categories.length);
        expect(res.body.data.length).toBe(categories.length);
    });

    it('/categories should return all categories and check top collections', async () => {
        const res = await request(server).get(`/categories`).expect(HttpStatus.OK);
        expectPaginatedResponse(res);
        expect(res.body.total).toBe(categories.length);
        expect(res.body.data.length).toBe(categories.length);
        res.body.data.map(category => {
            const topCollections = category.topCollections;
            expect(topCollections.length).toBeGreaterThan(0);
            expect(topCollections.length).toBeLessThanOrEqual(CategoryDao.LIMIT_COLLECTIONS_PER_CATEGORY);
            for (let i = 1; i < topCollections.length; i++) {
                expect(topCollections[i - 1].popularity).toBeGreaterThanOrEqual(topCollections[i].popularity);
            }
        });
    });

    it(
        '/categories should return all categories and unique top collections objects per category',
        async () => {
            await tokenCollectionModel.deleteMany();

            const [firstCategory, secondCategory] = await categoryModel.find();

            const collection = randomCollection({ _id: new ObjectID() } as any, firstCategory);
            collection.categoryIds = [firstCategory._id, secondCategory._id];
            const tokenCollectionEntity = await tokenCollectionModel.create(collection);

            expect(tokenCollectionEntity.categoryIds.length).toBe(collection.categoryIds.length);

            const tokenCollections = await tokenCollectionModel.find();
            expect(tokenCollections.length).toBe(1);

            const res = await request(server).get(`/categories`).expect(HttpStatus.OK);
            expectPaginatedResponse(res);
            expect(res.body.total).toBe(categories.length);
            expect(res.body.data.length).toBe(categories.length);
            res.body.data.map(category => {
                if (category.topCollections.length) {
                    expect(category.topCollections.length).toBe(1);
                }
            });
    });
});
