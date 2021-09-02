import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import * as nodemailer from "nodemailer";
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    expectPaginatedResponse,
    getToken,
    prepareDb,
    prepareMetadata,
    prepareTokenCollections,
    randomCard,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { TokenCollectionsModule } from '../src/tokenCollections/token-collections.module';
import { DaoModelNames, SortOrder } from '../src/types/constants';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import { ICardDocument } from '../src/cards/schemas/cards.schema';
import { ObjectID } from 'mongodb';
import { blockchainConfig } from '../src/config';
import { Network } from '../src/config/types/constants';
import { AuthModule } from '../src/auth/auth.module';
import { StorageService } from '../src/utils/storage.service';
import { IContractMetadataDocument } from '../src/metadata/schemas/contract-metadata.schema';
import { IUserDocument } from '../src/users/schemas/user.schema';

jest.mock("nodemailer", () => ({
    createTransport: () => ({
        sendMail: jest.fn(),
    }),
}));

describe('TokenCollectionsController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let user;
    let server;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let contractMetadataModel: Model<IContractMetadataDocument>;
    let userModel: Model<IUserDocument>;
    let cardModel: Model<ICardDocument>;
    let defaultHeaders: { Authorization: string };
    let storageService: StorageService;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, TokenCollectionsModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        contractMetadataModel = app.get(getModelToken(DaoModelNames.contractMetadata));
        userModel = app.get(getModelToken(DaoModelNames.user));
        cardModel = app.get(getModelToken(DaoModelNames.card));
        storageService = app.get(StorageService);
    });

    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
        await prepareTokenCollections(dbConnection, user);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/users/collections/:tokenCollectionId/report should return 201 for correct body', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();

        await request(server)
            .post(`/users/collections/${tokenCollection._id}/report`)
            .set(defaultHeaders)
            .send({ email: 'test@test.com', message: "Hey everyone!", walletAddress: '123', link: 'test.com/' })
            .expect(HttpStatus.CREATED);
    });

    it ('/users/collections/:tokenCollectionId/report should return 400 with incorrect email', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();

        await request(server)
            .post(`/users/collections/${tokenCollection._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/collections/:tokenCollectionId/report should return 400 with incorrect wallet address', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();

        await request(server)
            .post(`/users/collections/${tokenCollection._id}/report`)
            .set(defaultHeaders)
            .send({
                email: 'test@test.com',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/collections/:tokenCollectionId/report should return 400 with incorrect link', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();

        await request(server)
            .post(`/users/collections/${tokenCollection._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                email: 'test@test.com'
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/:userId/collections should get user created collections', async () => {
        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 1, offset: 0, created: true })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        expect(res.body.data[0].id).toBeDefined();
        expect(res.body.data[0].id.length).toBeGreaterThan(0);
    });

    it('/users/:userId/collections should return 404 with wrong user', async () => {
        await request(server)
            .get(`/users/undefined/collections`)
            .query({ limit: 1, offset: 0, created: true })
            .expect(HttpStatus.NOT_FOUND);
    });

    it('/users/:userId/collections should return 400 with wrong query sort param', async () => {
        await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 1, offset: 0, sort: 'wrong_data', created: true })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/:userId/collections should return 200 with correct query sort param', async () => {
        await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 1, offset: 0, sort: SortOrder.asc, created: true })
            .expect(HttpStatus.OK);
    });

    it('/users/:userId/collections should return collections with addresses', async () => {
        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 5, offset: 0, popularityOrder: 'desc', created: true })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);

        res.body.data.forEach(collection => {
            expect(collection.contractAddress).toBeDefined();
            expect(collection.contractAddress.length).toBeGreaterThan(0);
        });
    });

    it('/users/collections/list should return correct response', async () => {
        const res = await request(server)
            .get('/users/collections/list')
            .query({ limit: 5, offset: 0, popularityOrder: 'desc' })
            .expect(HttpStatus.OK);
    
        expectPaginatedResponse(res);
        
        const popularities = res.body.data.map((item) => item.popularity);
        for (let i = 1; i < popularities.length; i++) {
            expect(popularities[i - 1]).toBeGreaterThanOrEqual(popularities[i]);
        }
    });

    it('/users/collections/list should return collections with addresses', async () => {
        const res = await request(server)
            .get('/users/collections/list')
            .query({ limit: 5, offset: 0, popularityOrder: 'desc' })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);

        res.body.data.forEach(collection => {
            expect(collection.contractAddress).toBeDefined();
            expect(collection.contractAddress.length).toBeGreaterThan(0);
        });
    });

    it('/users/:userId/collections should get collections where user has at least 1 card', async () => {
        const tokenCollectionInstance = await tokenCollectionModel.create(
            randomCollection(
                {_id: '606dd633253a047743e28838'} as any,
                {_id: '606dd633253a047743e28838'} as any
            )
        );
        await cardModel.create(
            randomCard(user, tokenCollectionInstance as any, null, false)
        );
        await tokenCollectionModel.deleteMany({ userId: user._id });

        const userCards = await cardModel.find({ balances: { $elemMatch: { userId: user._id } } });
        const userCardsCount = userCards.length;

        expect(userCardsCount).toBeGreaterThan(0);

        const userTokenCollections = [...new Set(userCards.map(c => c.tokenCollectionId.toString()))];

        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 1, offset: 0 })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        expect(res.body.total).toBeDefined();
        expect(res.body.total).toBe(userTokenCollections.length);
        res.body.data.forEach(collection => {
            expect(collection.id).toBeDefined();
            expect(collection.id.length).toBeGreaterThan(0);
            expect(collection.cards).toBeDefined();
            expect(collection.cards.length).toBeGreaterThan(0);
            expect(collection.cardsCount).toBeDefined();
            expect(collection.cardsCount).toBe(userCardsCount);
            expect(userTokenCollections.includes(collection.id)).toBeTruthy();
            expect(collection.contractAddress).toBeDefined();
            expect(collection.contractAddress).toBe(tokenCollectionInstance.contractId);
        });
    });

    it('/users/:userId/collections should return collections with user avatar', async () => {
        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ limit: 5 })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        expect(res.body.data[0].id).toBeDefined();
        expect(res.body.data[0].id.length).toBeGreaterThan(0);
        res.body.data.forEach(collection => {
            expect(collection.creator.avatar).toBeDefined();
            expect(collection.creator.avatar.location).toBeDefined();
            expect(collection.creator.avatar.location.length).toBeGreaterThan(0);
        });
    });

    it('/users/collections/list should return correct response', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();

        const res = await request(server)
            .get(`/users/collections/${tokenCollection.id}`)
            .expect(HttpStatus.OK);

        expect(res.body.id).toBeDefined();
        expect(res.body.id).toBe(tokenCollection.id);
        expect(res.body.name).toBeDefined();
        expect(res.body.name).toBe(tokenCollection.name);
        expect(res.body.contractAddress).toBeDefined();
        expect(res.body.contractAddress).toBe(tokenCollection.contractId);
    });

    it('/users/collections/:id should return collection with default sale contract', async () => {
        const tokenCollection = await tokenCollectionModel.findOne();
        tokenCollection.saleContract = null;
        await tokenCollection.save();

        const res = await request(server)
            .get(`/users/collections/${tokenCollection.id}`)
            .expect(HttpStatus.OK);

        const { marketPlaceFeeAddress, [Network.ETHEREUM]: { saleContractProxy, saleContract } } = blockchainConfig();

        expect(res.body.saleContract).toBeDefined();
        expect(res.body.saleContract.saleContract).toBeDefined();
        expect(res.body.saleContract.saleContract).toBe(saleContract);
        expect(res.body.saleContract.saleContractProxy).toBeDefined();
        expect(res.body.saleContract.saleContractProxy).toBe(saleContractProxy);
        expect(res.body.saleContract.marketPlaceFeeAddress).toBeDefined();
        expect(res.body.saleContract.marketPlaceFeeAddress).toBe(marketPlaceFeeAddress);
    });

    it('/users/collections/:id should return collection with custom sale contract', async () => {
        const saleContractProxy = 'customSaleContractProxy';
        const saleContract = 'customSaleContract';
        const marketPlaceFeeAddress = 'marketPlaceFeeAddress';

        const tokenCollection = await tokenCollectionModel.findOne();
        tokenCollection.saleContract = {
            saleContract,
            saleContractProxy,
            allowedCryptocurrencies: [{ symbol: 'TST', tokenAddress: 'address' }],
            marketPlaceFeeAddress
        };
        await tokenCollection.save();

        const res = await request(server)
            .get(`/users/collections/${tokenCollection.id}`)
            .expect(HttpStatus.OK);

        expect(res.body.saleContract).toBeDefined();
        expect(res.body.saleContract.saleContract).toBeDefined();
        expect(res.body.saleContract.saleContract).toBe(saleContract);
        expect(res.body.saleContract.saleContractProxy).toBeDefined();
        expect(res.body.saleContract.saleContractProxy).toBe(saleContractProxy);
        expect(res.body.saleContract.marketPlaceFeeAddress).toBeDefined();
        expect(res.body.saleContract.marketPlaceFeeAddress).toBe(marketPlaceFeeAddress);
    });

    it('/users/collections/list should return 404', async () => {
        await request(server)
            .get(`/users/collections/${new ObjectID()}`)
            .expect(HttpStatus.NOT_FOUND);
    });

    it(
        '/users/:userId/collections should get user created or where user has at least 1 card collections',
        async () => {
            const tokenCollectionInstance = await tokenCollectionModel.create(
                randomCollection(
                    {_id: '606dd633253a047743e28838'} as any,
                    {_id: '606dd633253a047743e28838'} as any
                )
            );
            await cardModel.create(
                randomCard(user, tokenCollectionInstance as any, null, false)
            );

            const userTokenCollections = await tokenCollectionModel.find({ userId: user._id });
            const userCards = await cardModel.find({ balances: { $elemMatch: { userId: user._id } } });
            const userCardsTokenCollectionIds = userCards.map(c => c.tokenCollectionId.toString());

            const checkCount = userTokenCollections.filter(t => !t.id.includes(userCardsTokenCollectionIds)).length +
                userCardsTokenCollectionIds.length;

            const res = await request(server)
                .get(`/users/${user._id}/collections`)
                .query({ created: false })
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            expect(res.body.total).toBe(checkCount);
        }
    );

    it('/users/:userId/collections should get user only created collections', async () => {
        const tokenCollectionInstance = await tokenCollectionModel.create(
            randomCollection(
                { _id: '606dd633253a047743e28838' } as any,
                { _id: '606dd633253a047743e28838' } as any
            )
        );
        await cardModel.create(
            randomCard(user, tokenCollectionInstance as any, null, false)
        );

        const userTokenCollections = await tokenCollectionModel.find({ userId: user._id });
        const userCards = await cardModel.find({ balances: { $elemMatch: { userId: user._id } } });
        const userCardsTokenCollectionIds = userCards.map(c => c.tokenCollectionId.toString());

        const checkCount = userTokenCollections.filter(t => !t.id.includes(userCardsTokenCollectionIds)).length;

        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .query({ created: true })
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        expect(res.body.total).toBe(checkCount);
    });

    it('/users/:userId/collections should get user collections cards count', async () => {
        const userTokenCollections = await tokenCollectionModel.find({ userId: user._id });
        expect(userTokenCollections).toBeDefined();
        expect(userTokenCollections.length).toBeGreaterThan(0);

        await cardModel.create(
            randomCard(user, userTokenCollections[0] as any, null, false)
        );

        const userCards = await cardModel.find({
            balances: { $elemMatch: { userId: user._id } },
            tokenCollectionId: { $in: userTokenCollections.map(c => c.id) }
        });
        const userCardsCollectionIds = [...new Set(userCards.map(c => c.tokenCollectionId.toString()))];

        expect(userCards).toBeDefined();
        expect(userCards.length).toBeGreaterThan(0);

        const res = await request(server)
            .get(`/users/${user._id}/collections`)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        const { body: { data } } = res;
        userCardsCollectionIds.map(userCollection => {
            const resCollection = data.find(c => c.id === userCollection);
            expect(resCollection).toBeDefined();
            expect(resCollection.userCardsCount).toBeDefined();
            expect(resCollection.userCardsCount)
                .toBe(userCards.filter(c => c.tokenCollectionId.toString() === resCollection.id).length);
        });
    });

    describe('Update contract (e2e) /users/collections/:id', () => {
        const contractAddress = 'contractAddress';
        const contractSlug = 'test-contract-slug';
        const updatedLogo = {
            provider: 's3',
            key: 'key',
            location: 'location-updated',
            etag: 'etag',
            bucket: 'bucket',
            mimetype: 'image/png',
            extension: 'png'
        };
        let collectionInstance: ITokenCollectionDocument;
        let contractMetadataInstance: IContractMetadataDocument;
        let collectionId: string;

        const getBody = () => {
            const updatedLinks = {
                website: 'https://test-site-updated',
                twitter: '@twitterTestUpdated',
            };
            const body = {
                description: 'description to update',
                symbol: 'symbol_updated',
                links: JSON.stringify(updatedLinks),
            };

            return { updatedLinks, body };
        }

        beforeEach(async () => {
            await prepareMetadata(dbConnection, user, contractAddress, contractSlug);
            collectionInstance = await tokenCollectionModel.findOne({ slug: contractSlug });
            collectionId = collectionInstance?.id;
            expect(collectionId).toBeDefined();
            expect(collectionId.length).toBeGreaterThan(0);

            contractMetadataInstance = await contractMetadataModel.findOne({ slug: contractSlug });
            expect(contractMetadataInstance).toBeDefined();

            jest.spyOn(storageService, 'upload').mockResolvedValue(updatedLogo);
            jest.spyOn(storageService, 'remove').mockResolvedValue(null);
        });

        it('Should update contract metadata and collection instance', async () => {
            const { body, updatedLinks } = getBody();

            await request(server)
                .put(`/users/collections/${collectionId}`)
                .set(defaultHeaders)
                .field(body)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NO_CONTENT);

            const updatedContractMetadataInstance = await contractMetadataModel.findOne({ slug: contractSlug });
            expect(updatedContractMetadataInstance).toBeDefined();
            expect(updatedContractMetadataInstance.description === contractMetadataInstance.description)
                .toBeFalsy();
            expect(updatedContractMetadataInstance.description).toBe(body.description);
            expect(updatedContractMetadataInstance.symbol === contractMetadataInstance.symbol).toBeFalsy();
            expect(updatedContractMetadataInstance.symbol).toBe(body.symbol);
            expect(updatedContractMetadataInstance.logo.location === contractMetadataInstance.logo.location)
                .toBeFalsy();
            expect(updatedContractMetadataInstance.logo.location).toBe(updatedLogo.location);
            expect(updatedContractMetadataInstance.links.website).toBe(updatedLinks.website);
            expect(updatedContractMetadataInstance.links.twitter).toBe(updatedLinks.twitter);

            const updatedCollectionInstance = await tokenCollectionModel.findOne({ slug: contractSlug });
            expect(updatedCollectionInstance).toBeDefined();
            expect(collectionInstance.id).toBe(updatedCollectionInstance.id);
            expect(updatedCollectionInstance.description === collectionInstance.description).toBeFalsy();
            expect(updatedCollectionInstance.description).toBe(body.description);
            expect(updatedCollectionInstance.symbol === collectionInstance.symbol).toBeFalsy();
            expect(updatedCollectionInstance.symbol).toBe(body.symbol);
            expect(updatedCollectionInstance.logo.location === collectionInstance.logo.location).toBeFalsy();
            expect(updatedCollectionInstance.logo.location).toBe(updatedLogo.location);
            expect(updatedCollectionInstance.links.website).toBe(updatedLinks.website);
            expect(updatedCollectionInstance.links.twitter).toBe(updatedLinks.twitter);
        });

        it('Should update contract metadata and collection instance only description', async () => {
            const body = { description: 'description to update' };

            await request(server)
                .put(`/users/collections/${collectionId}`)
                .set(defaultHeaders)
                .send(body)
                .expect(HttpStatus.NO_CONTENT);

            const updatedContractMetadataInstance = await contractMetadataModel.findOne({ slug: contractSlug });
            expect(updatedContractMetadataInstance).toBeDefined();
            expect(updatedContractMetadataInstance.description === contractMetadataInstance.description)
                .toBeFalsy();
            expect(updatedContractMetadataInstance.description).toBe(body.description);
            expect(updatedContractMetadataInstance.symbol === contractMetadataInstance.symbol).toBeTruthy();
            expect(updatedContractMetadataInstance.logo.location === contractMetadataInstance.logo.location)
                .toBeTruthy();
            expect(updatedContractMetadataInstance.logo.location).toBeDefined();
            expect(updatedContractMetadataInstance.logo.location.length).toBeGreaterThan(0);

            const updatedCollectionInstance = await tokenCollectionModel.findOne({ slug: contractSlug });
            expect(updatedCollectionInstance).toBeDefined();
            expect(collectionInstance.id).toBe(updatedCollectionInstance.id);
            expect(updatedCollectionInstance.description === collectionInstance.description).toBeFalsy();
            expect(updatedCollectionInstance.description).toBe(body.description);
            expect(updatedCollectionInstance.symbol === collectionInstance.symbol).toBeTruthy();
            expect(updatedCollectionInstance.logo.location === collectionInstance.logo.location).toBeTruthy();
            expect(updatedCollectionInstance.logo.location).toBeDefined();
            expect(updatedCollectionInstance.logo.location.length).toBeGreaterThan(0);
        });

        it('Should update contract metadata and collection instance only logo', async () => {
            await request(server)
                .put(`/users/collections/${collectionId}`)
                .set(defaultHeaders)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NO_CONTENT);

            const updatedContractMetadataInstance = await contractMetadataModel.findOne({ slug: contractSlug });
            expect(updatedContractMetadataInstance.logo.location === contractMetadataInstance.logo.location)
                .toBeFalsy();
            expect(updatedContractMetadataInstance.logo.location).toBe(updatedLogo.location);
            expect(updatedContractMetadataInstance).toBeDefined();
            expect(updatedContractMetadataInstance.description === contractMetadataInstance.description)
                .toBeTruthy();
            expect(updatedContractMetadataInstance.symbol === contractMetadataInstance.symbol).toBeTruthy();

            const updatedCollectionInstance = await tokenCollectionModel.findOne({ slug: contractSlug });
            expect(updatedCollectionInstance).toBeDefined();
            expect(updatedCollectionInstance.logo.location === collectionInstance.logo.location).toBeFalsy();
            expect(updatedCollectionInstance.logo.location).toBe(updatedLogo.location);
            expect(collectionInstance.id).toBe(updatedCollectionInstance.id);
            expect(updatedCollectionInstance.description === collectionInstance.description).toBeTruthy();
            expect(updatedCollectionInstance.symbol === collectionInstance.symbol).toBeTruthy();
        });

        it('Should return 401 without access token', async () => {
            const { body } = getBody();

            await request(server)
                .put(`/users/collections/${collectionId}`)
                .field(body)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('Should return 404 with not exists collection id', async () => {
            const { body } = getBody();

            await request(server)
                .put(`/users/collections/${new ObjectID().toString()}`)
                .set(defaultHeaders)
                .field(body)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NOT_FOUND);
        });

        it('Should return 404 with wrong collection id', async () => {
            const { body } = getBody();

            await request(server)
                .put(`/users/collections/undefined`)
                .set(defaultHeaders)
                .field(body)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NOT_FOUND);
        });

        it('Should return 404 by someone else access token', async () => {
            const newUser = await userModel.create({ ethAddress: 'test' });
            const token = await getToken(app, dbConnection, { _id: newUser._id.toString() } as any);

            const { body } = getBody();

            await request(server)
                .put(`/users/collections/${collectionId}`)
                .set({ Authorization: `Bearer ${token}` })
                .field(body)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NOT_FOUND);
        });

        it('Should update contract metadata and collection instance if logo doesnt set', async () => {
            await tokenCollectionModel.findByIdAndUpdate(collectionId, { logo: null });
            await request(server)
                .put(`/users/collections/${collectionId}`)
                .set(defaultHeaders)
                .attach('logo', './test/files/img1.jpg')
                .expect(HttpStatus.NO_CONTENT);

            const updatedContractMetadataInstance = await contractMetadataModel.findOne({ slug: contractSlug });
            expect(updatedContractMetadataInstance.logo.location === contractMetadataInstance.logo.location)
                .toBeFalsy();
            expect(updatedContractMetadataInstance.logo.location).toBe(updatedLogo.location);
            expect(updatedContractMetadataInstance).toBeDefined();
            expect(updatedContractMetadataInstance.description === contractMetadataInstance.description)
                .toBeTruthy();
            expect(updatedContractMetadataInstance.symbol === contractMetadataInstance.symbol).toBeTruthy();

            const updatedCollectionInstance = await tokenCollectionModel.findOne({ slug: contractSlug });
            expect(updatedCollectionInstance).toBeDefined();
            expect(updatedCollectionInstance.logo.location === collectionInstance.logo.location).toBeFalsy();
            expect(updatedCollectionInstance.logo.location).toBe(updatedLogo.location);
            expect(collectionInstance.id).toBe(updatedCollectionInstance.id);
            expect(updatedCollectionInstance.description === collectionInstance.description).toBeTruthy();
            expect(updatedCollectionInstance.symbol === collectionInstance.symbol).toBeTruthy();
        });
    })
});
