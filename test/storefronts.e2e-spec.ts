import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import slugify from 'slugify';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    expectPaginatedResponse,
    getCard,
    getStoreFrontSettings,
    getToken,
    IUser,
    prepareDb,
    prepareStoreFront,
    randomCard,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { StoreFrontsModule } from '../src/storeFronts/store-fronts.module';
import { AuthModule } from '../src/auth/auth.module';
import { UtilsModule } from '../src/utils/utils.module';
import { StorageService } from '../src/utils/storage.service';
import { IStoreFrontDocument, IStoreFrontLeanDocument } from '../src/storeFronts/schemas/store-fronts.schema';
import { DaoModelNames } from '../src/types/constants';
import { ICardDocument, ICardLeanDocument } from '../src/cards/schemas/cards.schema';
import {
    StoreFrontCardStatus,
    StoreFrontCollectionStatus,
    StoreFrontPage,
    StoreFrontPageBlock
} from '../src/storeFronts/types/enums';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import { IUserDocument } from '../src/users/schemas/user.schema';
import { ObjectID } from 'mongodb';
import { Errors } from '../src/storeFronts/types/errors';
import { v4 as uuidv4 } from 'uuid';
import { Pagination } from '../src/config/types/constants';
import { StoreFrontsService } from '../src/storeFronts/store-fronts.service';

describe('StoreFrontController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let server: any;
    let storeFrontDocument: Model<IStoreFrontDocument>;
    let user: IUser;
    let storeFrontsService: StoreFrontsService;
    let cardModel: Model<ICardDocument>;
    let collectionModel: Model<ITokenCollectionDocument>;
    let userModel: Model<IUserDocument>;

    let defaultHeaders: { Authorization: string };

    async function prepareCards(user) {
        const card1 = await cardModel.create(
            randomCard(
                user,
                { _id: '6040f7db9f8f86d70bc97993' },
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        const card2 = await cardModel.create(
            randomCard(
                user,
                { _id: '6040f7db9f8f86d70bc97994' },
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        return [card1, card2];
    }

    async function prepareCollections(user) {
        const collection1 = await collectionModel.create(
            randomCollection(
                user,
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        const collection2 = await collectionModel.create(
            randomCollection(
                user,
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        return [collection1, collection2];
    }

    const storageService = {
        upload: () => {
            return {
                provider: 's3',
                key: 'key',
                location: 'location',
                etag: 'etag',
                bucket: 'bucket',
                mimetype: 'image/png',
                extension: 'png'
            };
        }
    };

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, UtilsModule, StoreFrontsModule],
            providers: [...baseAppProviders()]
        }).overrideProvider(StorageService).useValue(storageService)
            .compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        storeFrontDocument = app.get(getModelToken(DaoModelNames.storeFront));
        cardModel = app.get(getModelToken(DaoModelNames.card));
        userModel = app.get(getModelToken(DaoModelNames.user));
        collectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        storeFrontsService = app.get(StoreFrontsService);
    });

    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('post /store-fronts should return 201 with logo', async () => {
        const res = await request(server)
            .post(`/store-fronts`)
            .field({
                name: 'storefront1'
            })
            .attach('logo', './test/files/img1.jpg')
            .set(defaultHeaders)
            .expect(HttpStatus.CREATED);
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBeDefined();
        expect(res.body.owner).toBeDefined();
        expect(res.body.logo.key).toBeDefined();
    });

    it('post /store-fronts should return 400 without logo', async () => {
        await request(server)
            .post(`/store-fronts`)
            .field({
                name: 'storefront1'
            })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('post /store-fronts should return 400 with not image file', async () => {
        await request(server)
            .post(`/store-fronts`)
            .field({
                name: 'storefront1'
            })
            .attach('logo', './test/files/file.txt')
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('post /store-fronts should return 400 with empty name', async () => {
        await request(server)
            .post(`/store-fronts`)
            .send({
                name: ''
            })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/cards should return 404 with invalid sf id', async () => {
        await request(server)
            .put(`/store-fronts/6040f7db9f8f86d70bc97993/cards`)
            .send({
                cards: ['6040f7db9f8f86d70bc97993']
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('put /store-fronts/:id/cards should return 400 with empty cards', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: []
            })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/cards should return 200', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const [card, card2] = await prepareCards(user);
        await request(server)
            .put(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: [card.id, card2.id]
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.cards.length).toEqual(2);
    });

    it('delete /store-fronts/:id/cards should return 200', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            { owner: user._id, name: 'test', cards: [{ cardId: card1.id }, { cardId: card2.id }] }
        );
        await request(server)
            .delete(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: [card1.id]
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.cards.length).toEqual(1);
        expect(updatedSF.cards[0].cardId.toString()).toEqual(card2.id);
    });

    it('get /store-fronts/:id/cards should return 200', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            { owner: user._id, name: 'test', cards: [{ cardId: card1.id }, { cardId: card2.id }] }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(r);
        expect(r.body.data.length).toEqual(2);
    });

    it('get /store-fronts/:id/cards should return on sale cards', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE },
                    { cardId: card2.id, status: StoreFrontCardStatus.SOLD }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .query({ status: StoreFrontCardStatus.ON_SALE })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);
        expect(r.body.data).toBeDefined();
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/cards should return private cards', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE },
                    { cardId: card2.id, status: StoreFrontCardStatus.PRIVATE }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .query({ status: StoreFrontCardStatus.PRIVATE })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(r.body.data).toBeDefined();
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/cards should return archive cards', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE },
                    { cardId: card2.id, status: StoreFrontCardStatus.ARCHIVE }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .query({ status: StoreFrontCardStatus.ARCHIVE })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(r.body.data).toBeDefined();
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/cards should return featured cards', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE },
                    { cardId: card2.id, status: StoreFrontCardStatus.FEATURED }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .query({ status: StoreFrontCardStatus.FEATURED })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(r.body.data).toBeDefined();
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/cards should return sold cards', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE },
                    { cardId: card2.id, status: StoreFrontCardStatus.SOLD }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .query({ status: StoreFrontCardStatus.SOLD })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(r.body.data).toBeDefined();
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/cards should return cards with creator instances', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            { owner: user._id, name: 'test', cards: [{ cardId: card1.id }, { cardId: card2.id }] }
        );
        const res = await request(server)
            .get(`/store-fronts/${sf._id}/cards`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        res.body.data.forEach(card => {
            expect(card).toBeDefined();
            expect(card.creator).toBeDefined();
            expect(card.creator.id).toBeDefined();
            expect(card.creator.id.length).toBeGreaterThan(0);
            expect(card.creator.name).toBeDefined();
            expect(card.creator.name.length).toBeGreaterThan(0);
            expect(card.creator.avatar).toBeDefined();
            expect(card.creator.avatar.location).toBeDefined();
            expect(card.creator.avatar.location.length).toBeGreaterThan(0);
        });
    });

    it('put /store-fronts/:id/cards should add new collections', async () => {
        const card1 = await cardModel.create(
            randomCard(
                user,
                { _id: '6040f7db9f8f86d70bc97993' },
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id, status: StoreFrontCardStatus.ON_SALE }
                ],
                collections: [
                    { collectionId: '6040f7db9f8f86d70bc97993' }
                ]
            }
        );
        const [card, card2] = await prepareCards(user);
        await request(server)
            .put(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: [card.id, card2.id]
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.collections.length).toEqual(2);
    });

    it('delete /store-fronts/:id/cards should remove collections', async () => {
        const [card1, card2] = await prepareCards(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id },
                    { cardId: card2.id }
                ],
                collections: [
                    { collectionId: card1.tokenCollectionId },
                    { collectionId: card2.tokenCollectionId }
                ]
            }
        );
        await request(server)
            .delete(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: [card1.id]
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.collections.length).toEqual(1);
        expect(updatedSF.collections[0].collectionId).toEqual(card2.tokenCollectionId);
    });

    it('delete /store-fronts/:id/cards should not remove collections', async () => {
        const [card1, card2] = await prepareCards(user);
        const card = await cardModel.create(
            randomCard(
                user,
                { _id: '6040f7db9f8f86d70bc97993' },
                { _id: '6040f7db9f8f86d70bc97993' } as any
            )
        );
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                cards: [
                    { cardId: card1.id },
                    { cardId: card2.id },
                    { cardId: card.id }
                ],
                collections: [
                    { collectionId: card1.tokenCollectionId },
                    { collectionId: card2.tokenCollectionId }
                ]
            }
        );
        await request(server)
            .delete(`/store-fronts/${sf._id}/cards`)
            .send({
                cards: [card1.id]
            })
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.collections.length).toEqual(2);
    });

    it('get /store-fronts/:id/collections should return all collections with creator data', async () => {
        const [collection1, collection2] = await prepareCollections(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                collections: [
                    { collectionId: collection1.id },
                    { collectionId: collection2.id }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/collections`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(r);
        r.body.data.forEach(collection => {
            expect(collection.creator).toBeDefined();
            expect(collection.creator.id).toBeDefined();
            expect(collection.creator.id.length).toBeGreaterThan(0);
            expect(collection.creator.avatar).toBeDefined();
        });
    });

    describe('SF userCardsCount check', () => {
        let collection1: ITokenCollectionDocument,
            collection2: ITokenCollectionDocument;
        let cards: ICardDocument[];

        const prepareData = async () => {
            const [collection1, collection2] = await prepareCollections(user);

            const cards = await cardModel.insertMany([
                randomCard(user, collection1 as any, null, false),
                randomCard(user, collection1 as any, null, false),
                randomCard(user, collection1 as any, null, false),
                randomCard(user, collection1 as any, null, false),
                randomCard(user, collection1 as any, null, false),
                randomCard(user, collection2 as any, null, false),
                randomCard(user, collection2 as any, null, false),
                randomCard(user, collection2 as any, null, false),
            ]);

            return { collection1, collection2, cards };
        };

        const expectResponse = async (sfId: string, checkData: { collectionId: string, cards: ICardDocument[] }[]) => {
            const res = await request(server)
                .get(`/store-fronts/${sfId}/collections`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);
            res.body.data.forEach(collection => {
                const check = checkData.find(c => c.collectionId === collection.id);
                expect(check).toBeDefined();
                expect(collection.id).toBe(check.collectionId);
                expect(collection.userCardsCount).toBeDefined();
                expect(collection.userCardsCount).toBe(check.cards.length);
            });
        }

        beforeEach(async () => {
            const res = await prepareData();
            collection1 = res.collection1;
            collection2 = res.collection2;
            cards = res.cards;
        });

        it('get /store-fronts/:id/collections should return collections with user cards count 1', async () => {
            const sf = await storeFrontDocument.create(
                {
                    owner: user._id,
                    name: 'test',
                    cards: cards.map(c => ({ cardId: c.id, status: StoreFrontCardStatus.ON_SALE })),
                    collections: [
                        { collectionId: collection1.id },
                        { collectionId: collection2.id }
                    ]
                }
            );

            await expectResponse(
                sf.id,
                [
                    {
                        collectionId: collection1.id,
                        cards: await cardModel.find({ tokenCollectionId: collection1.id })
                    },
                    {
                        collectionId: collection2.id,
                        cards: await cardModel.find({ tokenCollectionId: collection2.id })
                    },
                ]
            );
        });

        it('get /store-fronts/:id/collections should return collections with user cards count 2', async () => {
            const sfCards = [
                { cardId: cards[0].id, status: StoreFrontCardStatus.ON_SALE },
                { cardId: cards[2].id, status: StoreFrontCardStatus.ON_SALE },
                { cardId: cards[3].id, status: StoreFrontCardStatus.ON_SALE },
                { cardId: cards[6].id, status: StoreFrontCardStatus.ON_SALE },
                { cardId: cards[7].id, status: StoreFrontCardStatus.ON_SALE },
            ];
            const sfCardsIds = sfCards.map(c => c.cardId);

            const sf = await storeFrontDocument.create(
                {
                    owner: user._id,
                    name: 'test',
                    cards: sfCards,
                    collections: [
                        { collectionId: collection1.id },
                        { collectionId: collection2.id }
                    ]
                }
            );

            await expectResponse(
                sf.id,
                [
                    {
                        collectionId: collection1.id,
                        cards: await cardModel.find({ tokenCollectionId: collection1.id, _id: { $in: sfCardsIds } })
                    },
                    {
                        collectionId: collection2.id,
                        cards: await cardModel.find({ tokenCollectionId: collection2.id, _id: { $in: sfCardsIds } })
                    },
                ]
            );
        });

        it('get /store-fronts/:id/collections should return collections with user cards count 3', async () => {
            const sfCards = [
                { cardId: cards[6].id, status: StoreFrontCardStatus.ON_SALE },
            ];
            const sfCardsIds = sfCards.map(c => c.cardId);

            const sf = await storeFrontDocument.create(
                {
                    owner: user._id,
                    name: 'test',
                    cards: sfCards,
                    collections: [
                        { collectionId: collection1.id },
                        { collectionId: collection2.id }
                    ]
                }
            );

            await expectResponse(
                sf.id,
                [
                    {
                        collectionId: collection1.id,
                        cards: await cardModel.find({ tokenCollectionId: collection1.id, _id: { $in: sfCardsIds } })
                    },
                    {
                        collectionId: collection2.id,
                        cards: await cardModel.find({ tokenCollectionId: collection2.id, _id: { $in: sfCardsIds } })
                    },
                ]
            );
        });
    });

    it('get /store-fronts/:id/collections should return all collections', async () => {
        const [collection1, collection2] = await prepareCollections(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                collections: [
                    { collectionId: collection1.id },
                    { collectionId: collection2.id }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/collections`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(r);
        expect(r.body.data.length).toEqual(2);
    });

    it('get /store-fronts/:id/collections should return FEATURED collections', async () => {
        const [collection1, collection2] = await prepareCollections(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                collections: [
                    { collectionId: collection1.id },
                    { collectionId: collection2.id, status: StoreFrontCollectionStatus.FEATURED }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/collections`)
            .query({ status: StoreFrontCollectionStatus.FEATURED })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(r);
        expect(r.body.data.length).toEqual(1);
    });

    it('get /store-fronts/:id/collections should return SOLD collections', async () => {
        const [collection1, collection2] = await prepareCollections(user);
        const sf = await storeFrontDocument.create(
            {
                owner: user._id,
                name: 'test',
                collections: [
                    { collectionId: collection1.id },
                    { collectionId: collection2.id, status: StoreFrontCollectionStatus.SOLD }
                ]
            }
        );
        const r = await request(server)
            .get(`/store-fronts/${sf._id}/collections`)
            .query({ status: StoreFrontCollectionStatus.SOLD })
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(r);
        expect(r.body.data.length).toEqual(1);
    });

    it('put /store-fronts/:id/settings should return 200 when update', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const newData = {
            name: 'storefront1',
            slug: 'slug',
            fee: 10,
            payoutAddress: 'address'
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .attach('logo', './test/files/img1.jpg')
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.name).toEqual(newData.name);
        expect(updatedSF.slug).toEqual(newData.slug);
        expect(updatedSF.fee).toEqual(newData.fee);
        expect(updatedSF.payoutAddress).toEqual(newData.payoutAddress);
        expect(updatedSF.logo).toBeDefined();
    });

    it('put /store-fronts/:id/settings convert to valid slug', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const slug = 'SomeInvalidString';
        const newData = {
            slug
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const updatedSF = await storeFrontDocument.findOne({ _id: sf._id });
        expect(updatedSF.slug).toEqual(slugify(slug));
    });


    it('put /store-fronts/:id/settings should return 400 with exists slug', async () => {
        const slug = 'slug';
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test', slug });
        const newData = {
            slug
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/settings should return 400 with wrong slug', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const newData = {
            slug: 'sl ug'
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });


    it('put /store-fronts/:id/settings should return 400 with fee>0', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const newData = {
            fee: 150
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/settings should return 400 with fee<0', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const newData = {
            fee: -150
        };

        await request(server)
            .put(`/store-fronts/${sf._id}/settings`)
            .field(newData)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('get /store-fronts/:id should return 200', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });

        const r = await request(server)
            .get(`/store-fronts/${sf._id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(r.body).toHaveProperty('name');
        expect(r.body).toHaveProperty('owner');
        expect(r.body).toHaveProperty('logo');
        expect(r.body).toHaveProperty('slug');
        expect(r.body).toHaveProperty('fee');
        expect(r.body).toHaveProperty('payoutAddress');
    });

    it('get /store-fronts/:id should return 404', async () => {
        await request(server)
            .get(`/store-fronts/6040f7db9f8f86d70bc97993`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('get /store-fronts/:id should return 404 not owner call', async () => {
        const sf = await storeFrontDocument.create({ owner: '6040f7db9f8f86d70bc97993', name: 'test' });
        await request(server)
            .get(`/store-fronts/${sf.id}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('put /store-fronts/:id/:page/settings should return 400 with not array req body', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .send({ data: 'data' })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong array req body', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .send([{}])
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong page url param', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/wrong/settings`)
            .set(defaultHeaders)
            .send(getStoreFrontSettings())
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/:page/settings should return 401 without access token', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .send(getStoreFrontSettings())
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('put /store-fronts/:id/:page/settings should return 404 by someone else store front ', async () => {
        const user = await userModel.create({ ethAddress: 'ethAddress' });
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send(getStoreFrontSettings())
            .expect(HttpStatus.NOT_FOUND);
    });

    it('put /store-fronts/:id/:page/settings should return 204', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        expect(sf.pages.length).toBe(0);

        const storeFrontPage = StoreFrontPage.HOME;

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await storeFrontDocument.findById(sf.id);
        expect(res).toBeDefined();
        expect(res.pages.length).toBe(1);
        res.pages.forEach(page => {
            expect(page.name).toBeDefined();
            expect(page.name).toBe(storeFrontPage);
            expect(page.blocks).toBeDefined();
            expect(page.blocks.length).toBe(getStoreFrontSettings().length);
            page.blocks.forEach(block => {
                expect(block.type).toBeDefined();
                expect(block.type.length).toBeGreaterThan(0);
                expect(block.settings).toBeDefined();
                expect(block.settings.texts).toBeDefined();
                expect(block.settings.texts.name).toBeDefined();
                expect(block.settings.texts.name.length).toBeGreaterThan(0);
                expect(block.settings.texts.headline).toBeDefined();
                expect(block.settings.texts.headline.length).toBeGreaterThan(0);
            });
        });
    });

    it('put /store-fronts/:id/:page/settings should remove bad data from body and return 204', async () => {
        const body = getStoreFrontSettings();
        body[0].settings['wrongData'] = 'wrongData';

        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        expect(sf.pages.length).toBe(0);

        const storeFrontPage = StoreFrontPage.HOME;

        const spy = jest.spyOn(storeFrontsService, 'storePageSetting');

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const [ , , pageSettings] = spy.mock.calls[0];
        expect(pageSettings[0].settings['wrongData']).toBeUndefined();
        expect(pageSettings[0].settings.texts).toBeDefined();

        const res = await storeFrontDocument.findById(sf.id);
        expect(res).toBeDefined();
        expect(res.pages.length).toBe(1);
    });

    it('put /store-fronts/:id/:page should return page setting', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const storeFrontPage = StoreFrontPage.HOME;

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await request(server)
            .get(`/store-fronts/${sf.id}/${storeFrontPage}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body).toBeDefined();
        expect(res.body.name).toBeDefined();
        expect(res.body.name).toBe(storeFrontPage);
        expect(res.body.blocks).toBeDefined();
        expect(res.body.blocks.length).toBe(getStoreFrontSettings().length);
        res.body.blocks.forEach(block => {
            expect(block.type).toBeDefined();
            expect(block.type.length).toBeGreaterThan(0);
            expect(block.settings).toBeDefined();
            expect(block.settings.texts).toBeDefined();
            expect(block.settings.texts.name).toBeDefined();
            expect(block.settings.texts.name.length).toBeGreaterThan(0);
            expect(block.settings.texts.headline).toBeDefined();
            expect(block.settings.texts.headline.length).toBeGreaterThan(0);
        });
    });

    it('put /store-fronts/:id/:page should return links', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const storeFrontPage = StoreFrontPage.HOME;
        const website = 'https://www.figma.com/';
        const twitter = 'https://www.twitter.com/';
        const telegram = 'https://www.telegram.com/';
        const discord = 'https://www.discord.com/';
        const medium = 'https://www.medium.com/';

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send([
                {
                    type: StoreFrontPageBlock.SUBSCRIBE,
                    settings: {
                        texts: {
                            name: 'subscribe name',
                            headline: 'subscribe headline'
                        },
                        links: {
                            website,
                            twitter,
                            telegram,
                            discord,
                            medium
                        },
                        settings: {
                            backgroundColor: 'white'
                        }
                    }
                }
            ])
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await request(server)
            .get(`/store-fronts/${sf.id}/${storeFrontPage}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.blocks).toBeDefined();
        expect(res.body.blocks.length).toBe(1);
        const [subscribeBlock] = res.body.blocks;
        expect(subscribeBlock.type).toBe(StoreFrontPageBlock.SUBSCRIBE);
        expect(subscribeBlock.settings).toBeDefined();
        expect(subscribeBlock.settings.links).toBeDefined();
        expect(subscribeBlock.settings.links.website).toBeDefined();
        expect(subscribeBlock.settings.links.website).toBe(website);
        expect(subscribeBlock.settings.links.twitter).toBeDefined();
        expect(subscribeBlock.settings.links.twitter).toBe(twitter);
        expect(subscribeBlock.settings.links.telegram).toBeDefined();
        expect(subscribeBlock.settings.links.telegram).toBe(telegram);
        expect(subscribeBlock.settings.links.discord).toBeDefined();
        expect(subscribeBlock.settings.links.discord).toBe(discord);
        expect(subscribeBlock.settings.links.medium).toBeDefined();
        expect(subscribeBlock.settings.links.medium).toBe(medium);
    });

    it('put /store-fronts/:id/:page should return page setting with logo', async () => {
        const logo = {
            provider: 's3',
            key: 'key',
            location: 'location',
            etag: 'etag',
            bucket: 'bucket',
            mimetype: 'image/png',
            extension: 'png'
        };
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test', logo });
        const storeFrontPage = StoreFrontPage.HOME;

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await request(server)
            .get(`/store-fronts/${sf.id}/${storeFrontPage}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.logo).toBeDefined();
        expect(res.body.logo.location).toBeDefined();
        expect(res.body.logo.location).toBe(logo.location);
        expect(res.body.logo.etag).toBeUndefined();
        expect(res.body.name).toBe(storeFrontPage);
    });

    it('put /store-fronts/:id/:page should return page setting without logo if logo not set', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const storeFrontPage = StoreFrontPage.HOME;

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await request(server)
            .get(`/store-fronts/${sf.id}/${storeFrontPage}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.logo).toBeDefined();
        expect(res.body.logo.location).toBeUndefined();
        expect(Object.values(res.body.logo).length).toBe(0);
        expect(res.body.name).toBe(storeFrontPage);
    });

    it('put /store-fronts/:id/:page should return 404 without release query and access token', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const storeFrontPage = StoreFrontPage.HOME;

        await request(server)
            .put(`/store-fronts/${sf.id}/${storeFrontPage}/settings`)
            .send(getStoreFrontSettings())
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        await request(server)
            .get(`/store-fronts/${sf.id}/${storeFrontPage}`)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('get /store-fronts/pages/settings/meta should return page setting metadata', async () => {
        const res = await request(server)
            .get(`/store-fronts/pages/settings/meta`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.settings).toBeDefined();
        expect(res.body.pages).toBeDefined();
        expect(res.body.pages.length).toBeGreaterThan(0);
    });

    it('put /store-fronts/:id/:page/settings should return 204 by testing all pages', async () => {
        const pages = Object.values(StoreFrontPage);
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });

        expect(sf.pages.length).toBe(0);

        await Promise.all(pages.map(page => {
            return request(server)
                .put(`/store-fronts/${sf.id}/${page}/settings`)
                .send(getStoreFrontSettings())
                .set(defaultHeaders)
                .expect(HttpStatus.NO_CONTENT);
        }));

        const res = await storeFrontDocument.findById(sf.id);

        expect(res).toBeDefined();
        expect(res.pages.length).toBe(pages.length);
        res.pages.forEach(page => {
            expect(page.name).toBeDefined();
            expect(page.blocks).toBeDefined();
            page.blocks.forEach(block => {
                expect(block.type).toBeDefined();
                expect(block.type.length).toBeGreaterThan(0);
                expect(block.settings).toBeDefined();
                expect(block.settings.texts).toBeDefined();
                expect(block.settings.texts.name).toBeDefined();
                expect(block.settings.texts.name.length).toBeGreaterThan(0);
                expect(block.settings.texts.headline).toBeDefined();
                expect(block.settings.texts.headline.length).toBeGreaterThan(0);
            });
        });
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong sortOrder block', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send([{
                type: StoreFrontPageBlock.HEADER,
                sortOrder: 1,
                settings: {}
            }])
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/:page/settings should return 204 with correct sortOrder block', async () => {
        const sortOrder = 1;
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const { settings } = getStoreFrontSettings().find(b => b.type === StoreFrontPageBlock.MOST_POPULAR);
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send([{
                type: StoreFrontPageBlock.MOST_POPULAR,
                sortOrder,
                settings
            }])
            .expect(HttpStatus.NO_CONTENT);

        const res = await storeFrontDocument.findById(sf.id);
        expect(res).toBeDefined();
        expect(res.pages).toBeDefined();

        const homePage = res.pages.find(page => page.name === StoreFrontPage.HOME);
        expect(homePage).toBeDefined();
        expect(homePage.blocks).toBeDefined();

        const mostPopularBlock = homePage.blocks.find(block => block.type === StoreFrontPageBlock.MOST_POPULAR);
        expect(mostPopularBlock).toBeDefined();
        expect(mostPopularBlock.sortOrder).toBeDefined();
        expect(mostPopularBlock.sortOrder).toBe(sortOrder);
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong isVisible block', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send([{
                type: StoreFrontPageBlock.HEADER,
                isVisible: true,
                settings: {}
            }])
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/:page/settings should return 204 with correct isVisible block', async () => {
        const sf = await storeFrontDocument.create({ owner: user._id, name: 'test' });
        const { settings } = getStoreFrontSettings().find(b => b.type === StoreFrontPageBlock.MOST_POPULAR);
        await request(server)
            .put(`/store-fronts/${sf.id}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send([{
                type: StoreFrontPageBlock.MOST_POPULAR,
                isVisible: false,
                settings
            }])
            .expect(HttpStatus.NO_CONTENT);

        const res = await storeFrontDocument.findById(sf.id);
        expect(res).toBeDefined();
        expect(res.pages).toBeDefined();

        const homePage = res.pages.find(page => page.name === StoreFrontPage.HOME);
        expect(homePage).toBeDefined();
        expect(homePage.blocks).toBeDefined();

        const mostPopularBlock = homePage.blocks.find(block => block.type === StoreFrontPageBlock.MOST_POPULAR);
        expect(mostPopularBlock).toBeDefined();
        expect(mostPopularBlock.isVisible).toBeDefined();
        expect(mostPopularBlock.isVisible).toBeFalsy();
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong collections settings', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send(getStoreFrontSettings(undefined, [new ObjectID().toString()]))
            .expect(HttpStatus.BAD_REQUEST);
    });

    it(
        'put /store-fronts/:id/:page/settings should return 204 with correct collections settings',
        async () => {
            const sf = await prepareStoreFront(dbConnection, user);
            await request(server)
                .put(`/store-fronts/${sf._id.toString()}/${StoreFrontPage.HOME}/settings`)
                .set(defaultHeaders)
                .send(getStoreFrontSettings(undefined, [sf.collections[0].collectionId.toString()]))
                .expect(HttpStatus.NO_CONTENT);
        }
    );

    it('put /store-fronts/:id/:page/settings should store block digital collections', async () => {
        const sf = await prepareStoreFront(dbConnection, user);

        const storeFrontPage = StoreFrontPage.HOME;
        const digitalBody = {
            type: StoreFrontPageBlock.DIGITAL_COLLECTION,
            settings: {
                texts: {
                    name: 'digital_collection',
                    headline: 'digital_collection'
                },
                collectibles: {
                    itemSize: 'large',
                    collections: [sf.collections[0].collectionId.toString()]
                },
                settings: {
                    backgroundColor: 'white'
                }
            }
        };
        const body = [digitalBody];

        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/${storeFrontPage}/settings`)
            .send(body)
            .set(defaultHeaders)
            .expect(HttpStatus.NO_CONTENT);

        const res = await storeFrontDocument.findById(sf._id.toString());

        expect(res).toBeDefined();
        res.pages.forEach(page => {
            expect(page.name).toBeDefined();
            expect(page.blocks).toBeDefined();
            expect(page.blocks.length).toBe(body.length);
            const [digital] = page.blocks;
            expect(digital.type).toBeDefined();
            expect(digital.type).toBe(StoreFrontPageBlock.DIGITAL_COLLECTION);
            expect(digital.settings).toBeDefined();
            expect(digital.settings.texts).toBeDefined();
            expect(digital.settings.texts.name).toBeDefined();
            expect(digital.settings.texts.name).toBe(digitalBody.settings.texts.name);
            expect(digital.settings.texts.headline).toBeDefined();
            expect(digital.settings.texts.headline).toBe(digitalBody.settings.texts.headline);
            expect(digital.settings.collectibles).toBeDefined();
            expect(digital.settings.collectibles.itemSize).toBe(digitalBody.settings.collectibles.itemSize);
            expect(digital.settings.collectibles.collections.length)
                .toBe(digitalBody.settings.collectibles.collections.length);
            digital.settings.collectibles.collections.map(c => {
                expect(digitalBody.settings.collectibles.collections.find(dc => dc === c)).toBeDefined();
            });
            expect(digital.settings.settings).toBeDefined();
            expect(digital.settings.settings.backgroundColor).toBe(digitalBody.settings.settings.backgroundColor);
        });
    });

    it('put /store-fronts/:id/:page/settings should return 400 with wrong cards settings', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/${StoreFrontPage.HOME}/settings`)
            .set(defaultHeaders)
            .send(getStoreFrontSettings([new ObjectID().toString()]))
            .expect(HttpStatus.BAD_REQUEST);
    });

    it(
        'put /store-fronts/:id/:page/settings should return 204 with correct cards settings',
        async () => {
            const sf = await prepareStoreFront(dbConnection, user);
            await request(server)
                .put(`/store-fronts/${sf._id.toString()}/${StoreFrontPage.HOME}/settings`)
                .set(defaultHeaders)
                .send(getStoreFrontSettings([sf.cards[0].cardId.toString()]))
                .expect(HttpStatus.NO_CONTENT);
        }
    );

    it('put /store-fronts/:id/cards should return 403 with adding wrong cards', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        const { cardEntity } = await getCard(
            dbConnection,
            { _id: new ObjectID().toString(), ethAddress: 'test' } as any
        );
        await request(server)
            .put(`/store-fronts/${sf._id}/cards`)
            .send({ cards: [cardEntity._id.toString()] })
            .set(defaultHeaders)
            .expect(HttpStatus.FORBIDDEN);
    });

    it('put /store-fronts/:id/cards should return 400 with adding wrong cards ids format', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        await request(server)
            .put(`/store-fronts/${sf._id}/cards`)
            .send({ cards: ['wrong1', 'wrong2', 'wrong3'] })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('put /store-fronts/:id/publish should publish store front', async () => {
        const slug = 'test-sf';
        const sf = await prepareStoreFront(dbConnection, user);
        expect(sf.slug).toBeUndefined();
        expect(sf.release).toBeUndefined();

        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .set(defaultHeaders)
            .send({ slug })
            .expect(HttpStatus.NO_CONTENT);

        const updatedSf = await storeFrontDocument.findById(sf._id);
        expect(updatedSf.slug).toBe(slug);
        const release = updatedSf.release as IStoreFrontLeanDocument;

        expect(release).toBeDefined();
        expect(release.name).toBeDefined();
        expect(release.name).toBe(sf.name);
        expect(release.cards).toBeDefined();
        expect(release.cards).toEqual(JSON.parse(JSON.stringify(sf.cards)));
        expect(release.collections).toBeDefined();
        expect(release.collections).toEqual(JSON.parse(JSON.stringify(sf.collections)));
    });

    it('put /store-fronts/:id/publish should return 401 without access token', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('put /store-fronts/:id/publish should return 403 with wrong access token', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        const newUser = await userModel.create({ ethAddress: 'test' });
        const token = await getToken(app, dbConnection, { _id: newUser._id.toString() } as any);
        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .set({ Authorization: `Bearer ${token}` })
            .expect(HttpStatus.FORBIDDEN);
    });

    it('put /store-fronts/:id/publish should return 400 if slug not defined', async () => {
        const sf = await prepareStoreFront(dbConnection, user);
        const res = await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.SLUG_IS_REQUIRED);
    });

    it('put /store-fronts/:id/publish should return 400 if sf pages empty', async () => {
        const slug = 'test-sf';
        const sf = await prepareStoreFront(dbConnection, user);
        await storeFrontDocument.findByIdAndUpdate(sf._id, { pages: [] })
        const res = await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .send({ slug })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.STORE_FRONT_PAGES_EMPTY);
    });

    it('put /store-fronts/:id/publish should return 400 if sf cards empty', async () => {
        const slug = 'test-sf';
        const sf = await prepareStoreFront(dbConnection, user);
        await storeFrontDocument.findByIdAndUpdate(sf._id, { cards: [] })
        const res = await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .send({ slug })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.STORE_FRONT_CARDS_EMPTY);
    });

    it('put /store-fronts/:id/publish should return 400 if sf collections empty', async () => {
        const slug = 'test-sf';
        const sf = await prepareStoreFront(dbConnection, user);
        await storeFrontDocument.findByIdAndUpdate(sf._id, { collections: [] })
        const res = await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .send({ slug })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.STORE_FRONT_COLLECTIONS_EMPTY);
    });

    it('put /store-fronts/:id/publish should return 400 if slug already exists', async () => {
        const slug = 'test-sf';
        await storeFrontDocument.create({ owner: user._id, name: 'test', slug });
        const sf = await prepareStoreFront(dbConnection, user);
        const res = await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .set(defaultHeaders)
            .send({ slug })
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.STOREFRONT_WITH_SLUG_EXISTS);
    });

    it(
        'put /store-fronts/:id/publish should publish then update draft version and doesnt change release',
        async () => {
            const slug = 'test-sf';
            const sf = await prepareStoreFront(dbConnection, user);
            const sfCards = sf.cards;

            await request(server)
                .put(`/store-fronts/${sf._id.toString()}/publish`)
                .set(defaultHeaders)
                .send({ slug })
                .expect(HttpStatus.NO_CONTENT);

            const [card, card2] = await prepareCards(user);
            await request(server)
                .put(`/store-fronts/${sf._id}/cards`)
                .send({ cards: [card.id, card2.id] })
                .set(defaultHeaders)
                .expect(HttpStatus.NO_CONTENT);

            const updatedSf = await storeFrontDocument.findById(sf._id);

            expect(updatedSf.cards).toBeDefined();
            expect(updatedSf.cards.length).toBeGreaterThan(sfCards.length);

            const release = updatedSf.release as IStoreFrontLeanDocument;

            expect(release).toBeDefined();
            expect(release.cards).toBeDefined();
            expect(release.cards).toEqual(JSON.parse(JSON.stringify(sfCards)));
        }
    );

    it('put /store-fronts/releases/:slug should return store front release version', async () => {
        const slug = 'test-sf';
        const sf = await prepareStoreFront(dbConnection, user);

        await request(server)
            .put(`/store-fronts/${sf._id.toString()}/publish`)
            .set(defaultHeaders)
            .send({ slug })
            .expect(HttpStatus.NO_CONTENT);

        const res = await request(server)
            .get(`/store-fronts/releases/${slug}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.id).toBe(sf._id.toString());
        expect(res.body.name).toBeDefined();
        expect(res.body.name).toBe(sf.name.toString());
        expect(res.body.release).toBeUndefined();
    });

    it('put /store-fronts/releases/:slug should return 404', async () => {
        await request(server)
            .get(`/store-fronts/releases/${uuidv4()}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('put /store-fronts/releases/:slug should return 404 if store front doesnt have release', async () => {
        const slug = 'test-sf1';
        await storeFrontDocument.create({ owner: user._id, name: 'test', slug });
        await request(server)
            .get(`/store-fronts/releases/${slug}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('get users/:id/store-fronts should return user store fronts', async () => {
        await storeFrontDocument.insertMany([
            { owner: user._id.toString(), name: 'test1' },
            { owner: user._id.toString(), name: 'test2' },
            { owner: user._id.toString(), name: 'test3' },
            { owner: new ObjectID().toString(), name: 'test4' },
            { owner: new ObjectID().toString(), name: 'test5' },
        ]);

        const userStoreFronts = await storeFrontDocument
            .find({ owner: user._id.toString() })
            .find();
        const userStoreFrontsIds = userStoreFronts.map(sf => sf.id);

        const res = await request(server)
            .get(`/users/${user._id.toString()}/store-fronts`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);
        expect(res.body.total).toBe(userStoreFronts.length);
        res.body.data.forEach(item => expect(userStoreFrontsIds.includes(item.id)).toBeTruthy());
    });

    it('get users/:id/store-fronts should return 401 without access token', async () => {
        await request(server)
            .get(`/users/${user._id.toString()}/store-fronts`)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('get users/:id/store-fronts should return 400 with wrong limit', async () => {
        await request(server)
            .get(`/users/${user._id.toString()}/store-fronts`)
            .query({ limit: Pagination.MAX_ITEMS_PER_PAGE + 1 })
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    describe('release cards (e2e)', () => {
        let sfId: string;
        let user2: IUser;
        let defaultHeaders2: { Authorization: string };
        let saleCard,
            soldCard,
            privateCard,
            archiveCard,
            featuredCard: ICardDocument;
        let featuredCollection,
            soldCollection: ITokenCollectionDocument;
        let sf: IStoreFrontDocument;

        beforeEach(async () => {
            const data = await prepareDb(app, dbConnection, true);
            user2 = data.user;
            defaultHeaders2 = { Authorization: `Bearer ${data.token}` };
            const slug = 'test-store-fronts-cards';

            [
                saleCard,
                soldCard,
                privateCard,
                archiveCard,
                featuredCard
            ] = await cardModel.insertMany(Object.values(StoreFrontCardStatus).map(() => {
                return randomCard(
                    user2,
                    { _id: '6040f7db9f8f86d70bc97993' },
                    { _id: '6040f7db9f8f86d70bc97993' } as any,
                    false
                ) as ICardLeanDocument;
            }));

            [
                featuredCollection,
                soldCollection
            ] = await collectionModel.insertMany(Object.values(StoreFrontCollectionStatus).map(() => {
                return randomCollection(
                    user2,
                    { _id: '6040f7db9f8f86d70bc97993' } as any
                ) as any;
            }));

            sf = await storeFrontDocument.create(
                {
                    owner: user2._id,
                    name: 'test',
                    slug,
                    cards: [
                        { cardId: saleCard.id, status: StoreFrontCardStatus.ON_SALE },
                        { cardId: soldCard.id, status: StoreFrontCardStatus.SOLD },
                        { cardId: privateCard.id, status: StoreFrontCardStatus.PRIVATE },
                        { cardId: archiveCard.id, status: StoreFrontCardStatus.ARCHIVE },
                        { cardId: featuredCard.id, status: StoreFrontCardStatus.FEATURED }
                    ],
                    collections: [
                        { collectionId: featuredCollection.id, status: StoreFrontCollectionStatus.FEATURED },
                        { collectionId: soldCollection.id, status: StoreFrontCollectionStatus.SOLD },
                    ],
                    pages: [
                        {
                            name: 'home',
                            blocks: [
                                {
                                    sortOrder: 9,
                                    isVisible: true,
                                    type: 'header',
                                    settings: {
                                        collectibles: {
                                            collections: [
                                                '607ec6bc6155a43c9b144b1d',
                                                '60a510ba38cddf00087f0c4e'
                                            ],
                                            cards: [
                                                '60acba2a6c87e3000973a09a',
                                                '60a57006437b550008be60c6',
                                                '60a51119f655310009e0a709'
                                            ],
                                            choose: 'manual',
                                            itemsType: 'on_sale',
                                            itemSize: 'large',
                                            sort: 'most_popular'
                                        },
                                        texts: {
                                            name: 'text name',
                                            headline: 'text headline'
                                        }
                                    }
                                },
                            ]
                        }
                    ],
                }
            );
            sfId = sf._id.toString();
            await request(server)
                .put(`/store-fronts/${sfId}/publish`)
                .set(defaultHeaders2)
                .expect(HttpStatus.NO_CONTENT);
        });

        it('/store-fronts/:id/cards get release cards should return 404 without release query', async () => {
            await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .set(defaultHeaders)
                .expect(HttpStatus.NOT_FOUND);
        });

        it(
            '/store-fronts/:id/cards get cards should return 404 without release query and wrong token',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/cards`)
                    .set(defaultHeaders)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it(
            '/store-fronts/:id/cards get cards should return 200 without release query and correct token',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/cards`)
                    .set(defaultHeaders2)
                    .expect(HttpStatus.OK);
            }
        );

        it(
            '/store-fronts/:id/cards get cards should return 404 with release query and sf has not published',
            async () => {
                await storeFrontDocument.findByIdAndUpdate(sfId, { release: null })
                await request(server)
                    .get(`/store-fronts/${sfId}/cards`)
                    .query({ release: true })
                    .set(defaultHeaders)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it('/store-fronts/:id/cards get release cards should return 200', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(r);
            expect(r.body.data.length).toEqual(sf.cards.length);
        });

        it('/store-fronts/:id/cards get release - should return on sale cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, status: StoreFrontCardStatus.ON_SALE })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);
            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            expect(r.body.data[0].id).toEqual(saleCard.id);
        });

        it('/store-fronts/:id/cards get release - should return private cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, status: StoreFrontCardStatus.PRIVATE })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            expect(r.body.data[0].id).toEqual(privateCard.id);
        });

        it('/store-fronts/:id/cards get release - should return archive cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, status: StoreFrontCardStatus.ARCHIVE })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            expect(r.body.data[0].id).toEqual(archiveCard.id);
        });

        it('/store-fronts/:id/cards get release - should return featured cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, status: StoreFrontCardStatus.FEATURED })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            expect(r.body.data[0].id).toEqual(featuredCard.id);
        });

        it('/store-fronts/:id/cards get release - should return sold cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, status: StoreFrontCardStatus.SOLD })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            expect(r.body.data[0].id).toEqual(soldCard.id);
        });

        it('/store-fronts/:id/cards get release - should return sold and private cards', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/cards`)
                .query({ release: true, cards: [soldCard.id, privateCard.id] })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expect(r.body.data).toBeDefined();
            expect(r.body.data.length).toBeLessThan(sf.cards.length);
            r.body.data.map(c => expect([soldCard.id, privateCard.id].includes(c.id)).toBeTruthy());
        });

        it(
            '/store-fronts/:id/collections get release collections should return 404 without release query',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/collections`)
                    .set(defaultHeaders)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it(
            '/store-fronts/:id/collections should return 404 without release query and wrong token',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/collections`)
                    .set(defaultHeaders)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it(
            '/store-fronts/:id/collections should return 200 without release query and correct token',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/collections`)
                    .set(defaultHeaders2)
                    .expect(HttpStatus.OK);
            }
        );

        it(
            '/store-fronts/:id/collections should return 404 without release query and access token',
            async () => {
                await request(server)
                    .get(`/store-fronts/${sfId}/collections`)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it(
            '/store-fronts/:id/cards get cards should return 404 without release query and access token',
            async () => {
                await storeFrontDocument.findByIdAndUpdate(sfId, { release: null })
                await request(server)
                    .get(`/store-fronts/${sfId}/cards`)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it(
            '/store-fronts/:id/cards get cards should return 404 with release query and sf has not published',
            async () => {
                await storeFrontDocument.findByIdAndUpdate(sfId, { release: null })
                await request(server)
                    .get(`/store-fronts/${sfId}/cards`)
                    .query({ release: true })
                    .set(defaultHeaders)
                    .expect(HttpStatus.NOT_FOUND);
            }
        );

        it('/store-fronts/:id/collections get release - should return all collections', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/collections`)
                .query({ release: true })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(r);
            expect(r.body.data.length).toEqual(sf.collections.length);
        });

        it('/store-fronts/:id/collections get release - should return FEATURED collections', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/collections`)
                .query({ release: true, status: StoreFrontCollectionStatus.FEATURED })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(r);
            expect(r.body.data.length).toBeLessThan(sf.collections.length);
            expect(r.body.data[0].id).toEqual(featuredCollection.id);
        });

        it('/store-fronts/:id/collections get release - should return SOLD collections', async () => {
            const r = await request(server)
                .get(`/store-fronts/${sfId}/collections`)
                .query({ release: true, status: StoreFrontCollectionStatus.SOLD })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(r);
            expect(r.body.data.length).toBeLessThan(sf.collections.length);
            expect(r.body.data[0].id).toEqual(soldCollection.id);
        });
    });
});
