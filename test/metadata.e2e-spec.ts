import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    animationBase64,
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    getToken,
    imgBase64,
    IUser,
    prepareDb,
    prepareMetadata,
    randomCollection,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { AuthModule } from '../src/auth/auth.module';
import { MetadataModule } from '../src/metadata/metadata.module';
import { StorageService } from '../src/utils/storage.service';
import { ContractMetadataService, TokenMetadataService } from '../src/metadata/services';
import { DisplayType, MetadataFiles, MetadataType } from '../src/metadata/types/enums';
import { appConfig } from '../src/config';
import { Errors } from '../src/metadata/types/errors';
import { Errors as FileErrors } from '../src/files/types/errors';
import {
    IContractMetadataDocument,
    IContractMetadataLeanDocument
} from '../src/metadata/schemas/contract-metadata.schema';
import { DaoModelNames } from '../src/types/constants';
import { ObjectID } from 'mongodb';
import { ITokenCollectionDocument } from '../src/tokenCollections/schemas/token-collection.schema';
import { ITokenMetadataDocument } from '../src/metadata/schemas/token-metadata.schema';
import { IUserDocument } from '../src/users/schemas/user.schema';
import * as fileHelpers from '../src/helpers/file';
import { FileError } from '../src/files/files/file.error';

enum FileKey {
    image = 'image',
    animation = 'animation'
}

const getFormData = () => ({
    name: 'testName',
    description: 'testDescription',
    imageKey: FileKey.image,
});

const getContractFormData = () => ({
    name: 'testContractName',
    description: 'testContractDescription',
    slug: 'test-slug',
    symbol: 'TEST',
    links: JSON.stringify({
        website: 'https://test-site',
        twitter: '@twitterTest',
    }),
});

const getMetadataAttributes = () => ([
    {
        trait_type: 'testTrait1',
        value: 99,
    },
    {
        trait_type: 'testTrait2',
        value: 'testValue',
    },
    {
        trait_type: 'testTrait3',
        value: 1,
        display_type: DisplayType.number,
    },
    {
        trait_type: 'testTrait4',
        value: 5,
        display_type: DisplayType.boost_percentage,
    },
    {
        trait_type: 'testTrait5',
        value: 3,
        display_type: DisplayType.boost_number,
    },
    {
        trait_type: 'testTrait6',
        value: 3,
        max_value: 5,
        display_type: DisplayType.number,
    },
    {
        trait_type: 'testTrait7',
        value: Date.now(),
        display_type: DisplayType.date,
    },
    {
        value: 999,
    },
]);

describe('MetadataController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let defaultHeaders: { Authorization: string };
    let tokenMetadataService: TokenMetadataService;
    let contractMetadataService: ContractMetadataService;
    let appGlobalPrefix: string;
    let server: any;
    let user: IUser;
    let contractMetadataModel: Model<IContractMetadataDocument>;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let userModel: Model<IUserDocument>;

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
        },
        save: () => {
            return {
                provider: 's3',
                key: 'key',
                location: 'location',
                etag: 'etag',
                bucket: 'bucket',
                mimetype: 'image/png',
                extension: 'png'
            };
        },
        readFile: (key: FileKey) => Buffer.from(
            key === FileKey.image ? imgBase64 : animationBase64,
            'base64'
        ),
        getSignedUrl: (
            key: string,
            operation = 'putObject',
            expires = StorageService.SIGNED_URL_EXPIRES_SECONDS
        ) => ({
            url: 'signedUrl',
            key,
            bucket: 'bucket'
        })
    };

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, MetadataModule],
            providers: [...baseAppProviders()]
        })
            .overrideProvider(StorageService).useValue(storageService)
            .compile();

        app = createApp(moduleFixture);
        appGlobalPrefix = appConfig().appGlobalRoutePrefix;
        app.setGlobalPrefix(appGlobalPrefix);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        tokenMetadataService = app.get(TokenMetadataService);
        contractMetadataService = app.get(ContractMetadataService);
        contractMetadataModel = app.get(getModelToken(DaoModelNames.contractMetadata));
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        userModel = app.get(getModelToken(DaoModelNames.user));
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

    describe('Metadata token (e2e)', () => {
        let contractMetadata: IContractMetadataLeanDocument;
        let tokenCollection: ITokenCollectionDocument;

        const getTokenMetadata = async (uri: string): Promise<ITokenMetadataDocument | null> => {
            const parsedUrl = new URL(uri).pathname.split('/');
            const tokenIdentifier = parsedUrl[parsedUrl.length - 1];

            return tokenMetadataService.findMetadataByContractMetadataIdAndTokenIdentifier(
                contractMetadata._id.toString(),
                parseInt(tokenIdentifier, 10)
            );
        }

        beforeEach(async () => {
            const data = await prepareMetadata(dbConnection, user);
            contractMetadata = data.contractMetadata;
            const collection = randomCollection(user, { _id: new ObjectID() } as any);
            collection.slug = contractMetadata.slug;
            tokenCollection = await tokenCollectionModel.create(collection);
        });

        it('[token metadata uri] should create metadata and return uri', async () => {
            const formData = getFormData();

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            expect(res.body).toBeDefined();
            expect(res.body.uri).toBeDefined();
            expect(res.body.uri.length).toBeGreaterThan(0);

            const metadata = await getTokenMetadata(res.body.uri);

            expect(metadata).toBeDefined();
            expect(metadata.name).toBeDefined();
            expect(metadata.name).toBe(formData.name);
            expect(metadata.description).toBeDefined();
            expect(metadata.description).toBe(formData.description);
            expect(metadata.image).toBeDefined();
            expect(metadata.image.location).toBeDefined();
        });

        it('[token metadata uri] should create metadata with animation and return uri', async () => {
            const formData = getFormData();
            formData['animationKey'] = FileKey.animation;

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            expect(res.body).toBeDefined();
            expect(res.body.uri).toBeDefined();
            expect(res.body.uri.length).toBeGreaterThan(0);

            const metadata = await getTokenMetadata(res.body.uri);

            expect(metadata).toBeDefined();
            expect(metadata.image).toBeDefined();
            expect(metadata.image.location).toBeDefined();
            expect(metadata.animation).toBeDefined();
            expect(metadata.animation.location).toBeDefined();
        });

        it('[token metadata uri] should create metadata with attributes and return uri', async () => {
            const attributes = getMetadataAttributes();
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            expect(res.body).toBeDefined();
            expect(res.body.uri).toBeDefined();
            expect(res.body.uri.length).toBeGreaterThan(0);

            const metadata = await getTokenMetadata(res.body.uri);

            expect(metadata).toBeDefined();
            expect(metadata.attributes).toBeDefined();
            expect(metadata.attributes.length).toBe(attributes.length);
        });

        it('[token metadata uri] should return 401 without access token', async () => {
            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(getFormData())
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('[token metadata uri] should return 400 without image', async () => {
            const formData = getFormData();
            delete formData.imageKey;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 400 with wrong external_url', async () => {
            const formData = getFormData() as any;
            formData.external_url = 'wrong url';

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 201 without description', async () => {
            const formData = getFormData();
            delete formData.description;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);
        });

        it('[token metadata uri] should return 400 without name', async () => {
            const formData = getFormData();
            delete formData.name;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 400 with wrong background_color', async () => {
            const formData = getFormData() as any;
            formData.background_color = 'wrong color';

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 400 with wrong youtube_url', async () => {
            const formData = getFormData() as any;
            formData.youtube_url = 'wrong url';

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 400 without attributes value', async () => {
            const attributes = [{ trait_type: 'testTrait1' }];
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it(
            '[token metadata uri] should return 400 with wrong attributes value and display_type date',
            async () => {
                const attributes = [
                    {
                        trait_type: 'testTrait1',
                        value: 'wrongDate',
                        display_type: DisplayType.date
                    }
                ];
                const formData = getFormData() as any;
                formData.attributes = JSON.stringify(attributes);

                await request(server)
                    .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                    .send(formData)
                    .set(defaultHeaders)
                    .expect(HttpStatus.BAD_REQUEST);
            }
        );

        it(
            '[token metadata uri] should return 400 with wrong attributes value and display_type number',
            async () => {
                const attributes = [
                    {
                        trait_type: 'testTrait1',
                        value: 'wrong value',
                        display_type: DisplayType.number
                    }
                ];
                const formData = getFormData() as any;
                formData.attributes = JSON.stringify(attributes);

                await request(server)
                    .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                    .send(formData)
                    .set(defaultHeaders)
                    .expect(HttpStatus.BAD_REQUEST);
            }
        );

        it('[token metadata uri] should return 400 without display type for max value', async () => {
            const attributes = [
                {
                    trait_type: 'testTrait1',
                    value: 10,
                    max_value: 12,
                }
            ];
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 400 with wrong display type for max value', async () => {
            const attributes = [
                {
                    trait_type: 'testTrait1',
                    value: 10,
                    max_value: 12,
                    display_type: DisplayType.date,
                }
            ];
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 201 with correct display type for max value', async () => {
            const attributes = [
                {
                    trait_type: 'testTrait1',
                    value: 10,
                    max_value: 12,
                    display_type: DisplayType.number,
                }
            ];
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);
        });

        it('[token metadata uri] should return 400 with value greater then max value', async () => {
            const attributes = [
                {
                    trait_type: 'testTrait1',
                    value: 10,
                    max_value: 5,
                    display_type: DisplayType.number,
                }
            ];
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('[token metadata uri] should return 200 by token uri', async () => {
            const formData = getFormData();

            const post = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            const uri = post.body.uri;
            expect(uri).toBeDefined();

            const get = await request(server)
                .get(new URL(uri).pathname)
                .expect(HttpStatus.OK);

            expect(get).toBeDefined();
            expect(get.body).toBeDefined();
            expect(get.body.name).toBeDefined();
            expect(get.body.name).toBe(formData.name);
            expect(get.body.description).toBeDefined();
            expect(get.body.description).toBe(formData.description);
            expect(get.body.attributes).toBeUndefined();
        });

        it('[token metadata uri] should return 200 by token uri with attributes', async () => {
            const attributes = getMetadataAttributes();
            const formData = getFormData() as any;
            formData.attributes = JSON.stringify(attributes);

            const post = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(formData)
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            const uri = post.body.uri;
            expect(uri).toBeDefined();

            const get = await request(server)
                .get(new URL(uri).pathname)
                .expect(HttpStatus.OK);

            expect(get).toBeDefined();
            expect(get.body).toBeDefined();
            expect(get.body.name).toBeDefined();
            expect(get.body.name).toBe(formData.name);
            expect(get.body.description).toBeDefined();
            expect(get.body.description).toBe(formData.description);
            expect(get.body.attributes).toBeDefined();
            expect(get.body.attributes.length).toBe(attributes.length);
            get.body.attributes.forEach(attr => expect(attr.value).toBeDefined());
        });

        it('[token metadata uri] should return 404 when try to store not owner', async () => {
            const newUser = await userModel.create({ ethAddress: 'test' });
            const token = await getToken(app, dbConnection, { _id: newUser._id.toString() } as any);

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(getFormData())
                .set({ Authorization: `Bearer ${token}` })
                .expect(HttpStatus.NOT_FOUND);
        });

        it('[token metadata uri] should return 404 when contract metadata doesnt exists', async () => {
            await contractMetadataModel.deleteMany();
            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(getFormData())
                .set(defaultHeaders)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('[token metadata uri] should return 400 if next token identifier null', async () => {
            jest.spyOn(tokenMetadataService, 'getNextTokenIdentifier').mockResolvedValue(null);

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(getFormData())
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.message).toBeDefined();
            expect(res.body.message).toEqual(Errors.CAN_NOT_GET_NEXT_TOKEN_IDENTIFIER);
        });

        it('[token metadata uri] should return 404 by wrong token uri', async () => {
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/users/undefined/collections/undefined/5`)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('[token metadata uri] should throw CAN_NOT_GET_FILE_TYPE', async () => {
            jest.spyOn(fileHelpers, 'getFileTypeFromBuffer').mockImplementation(
                async () => {
                    throw new FileError(FileErrors.CAN_NOT_GET_FILE_TYPE);
                }
            );

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections/${tokenCollection.id}/cards`)
                .send(getFormData())
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.message).toBeDefined();
            expect(res.body.message).toEqual(FileErrors.CAN_NOT_GET_FILE_TYPE);
        });
    });

    describe('Metadata contract (e2e)', () => {
        it('/metadata/collections should create contract metadata and return uri', async () => {
            const formData = getContractFormData();

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            expect(res.body).toBeDefined();
            expect(res.body.uri).toBeDefined();
            expect(res.body.uri.length).toBeGreaterThan(0);

            const contractMetadata = await contractMetadataService.findMetadataByUserIdAndSlug(
                user._id.toString(),
                formData.slug
            );

            expect(contractMetadata).toBeDefined();
            expect(contractMetadata.name).toBeDefined();
            expect(contractMetadata.name).toBe(formData.name);
            expect(contractMetadata.description).toBeDefined();
            expect(contractMetadata.description).toBe(formData.description);
            expect(contractMetadata.logo).toBeDefined();
            expect(contractMetadata.logo.location).toBeDefined();
        });

        it('/metadata/collections should create contract metadata without symbol', async () => {
            const formData = getContractFormData();
            delete formData.symbol;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);
        });

        it('/metadata/collections should return 400 without slug', async () => {
            const formData = getContractFormData();
            delete formData.slug;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/metadata/collections should return 400 without name', async () => {
            const formData = getContractFormData();
            delete formData.name;

            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/metadata/collections should return 401 without access token', async () => {
            await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(getFormData())
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/metadata/collections should return 400 if slug already exists', async () => {
            const formData = getContractFormData();
            await contractMetadataModel.collection.insertOne({ slug: formData.slug });

            const res = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(getContractFormData())
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.message).toBeDefined();
            expect(res.body.message).toEqual(Errors.METADATA_EXISTS);
        });

        it('/metadata/collections should return 200 by contract uri', async () => {
            const formData = getContractFormData();

            const post = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            const uri = post.body.uri;
            expect(uri).toBeDefined();

            const get = await request(server)
                .get(new URL(uri).pathname)
                .expect(HttpStatus.OK);

            expect(get).toBeDefined();
            expect(get.body).toBeDefined();
            expect(get.body.name).toBeDefined();
            expect(get.body.name).toBe(formData.name);
            expect(get.body.description).toBeDefined();
            expect(get.body.description).toBe(formData.description);
        });

        it('/metadata/collections should return 404 by wrong token uri', async () => {
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/users/${user._id.toString()}/collections/undefined`)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('/metadata/collections/uri should return 200 by contract uri', async () => {
            const formData = getContractFormData();
            const { slug } = formData;
            const { _id : userId } = user;
            
            // TODO: use mock instead of calling real route for creation
            const post = await request(server)
                .post(`/${appGlobalPrefix}/metadata/collections`)
                .field(formData)
                .attach('logo', './test/files/img1.jpg')
                .set(defaultHeaders)
                .expect(HttpStatus.CREATED);

            const uri = post.body.uri;
            expect(uri).toBeDefined();

            const get = await request(server)
                .get(`/${appGlobalPrefix}/metadata/users/${userId}/collections/${slug}/uri`)
                .expect(HttpStatus.OK);

            expect(get.body).toBeDefined();
            expect(get.body.uri).toBeDefined();
            expect(get.body.uri.length).toBeGreaterThan(0);
        });

        it('/metadata/collections/uri should return 404 by wrong contract uri', async () => {
            const { _id : userId } = user;
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/users/${userId}/collections/undefined/uri`)
                .expect(HttpStatus.NOT_FOUND);
        });
    });

    describe('Metadata signed urls (e2e)', () => {
        it('Should return token signed urls', async () => {
            const res = await request(server)
                .get(`/${appGlobalPrefix}/metadata/signed-urls`)
                .query({ type: MetadataType.token })
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            const fileNames = MetadataFiles[MetadataType.token];

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(Object.values(res.body).length).toBe(fileNames.length);

            fileNames.forEach(fileName => {
                expect(res.body[fileName]).toBeDefined();
                expect(res.body[fileName].url).toBeDefined();
                expect(res.body[fileName].url.length).toBeGreaterThan(0);
                expect(res.body[fileName].key).toBeDefined();
                expect(res.body[fileName].key.length).toBeGreaterThan(0);
                expect(res.body[fileName].bucket).toBeDefined();
                expect(res.body[fileName].bucket.length).toBeGreaterThan(0);
            });
        });

        it('Should return 400 with wrong query type', async () => {
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/signed-urls`)
                .query({ type: 'wrong type' })
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('Should return 400 without query type', async () => {
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/signed-urls`)
                .set(defaultHeaders)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('Should return 401 without access token', async () => {
            await request(server)
                .get(`/${appGlobalPrefix}/metadata/signed-urls`)
                .query({ type: MetadataType.token })
                .expect(HttpStatus.UNAUTHORIZED);
        });
    });
});
