import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    createClient,
    getExternalAccessToken,
    IUser,
    prepareExternalCollectible,
    shutdownTest
} from '../lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { AuthModule } from '../../src/auth/auth.module';
import { ExternalModule } from '../../src/external/external.module';
import { v4 as uuidv4 } from 'uuid';
import { IEncryptedData } from '../../src/types/scheme';
import { CryptService } from '../../src/crypt/crypt.service';
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import { StorageService } from '../../src/utils/storage.service';
import {
    ICollectibleDocument,
    ICollectibleLeanDocument
} from '../../src/external/collectibles/schemas/collectible.schema';
import { DaoModelNames } from '../../src/types/constants';
import { IContractMetadataDocument } from '../../src/metadata/schemas/contract-metadata.schema';
import { ITokenMetadataDocument, ITokenMetadataLeanDocument } from '../../src/metadata/schemas/token-metadata.schema';
import { IClientDocument, IClientLeanDocument } from '../../src/external/clients/schemas/client.schema';
import { UsersService } from '../../src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from '../../src/config';
import { ClientsService } from '../../src/external/clients/clients.service';
import { Errors } from '../../src/external/collectibles/types/errors';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { ObjectID } from 'mongodb';
import { getAddressFromPrivateKey } from '../../src/helpers/blockchain';

describe('CollectiblesController (e2e)', () => {
    const clientId = uuidv4();
    const clientSecret = 'clientSecret';

    let clientSecretEncrypted: IEncryptedData;
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let server: any;
    let cryptService: CryptService;
    let httpService: HttpService;
    let storageService: StorageService;
    let usersService: UsersService;
    let clientsService: ClientsService;
    let configService: ConfigService;
    let collectibleModel: Model<ICollectibleDocument>;
    let contractMetadataModel: Model<IContractMetadataDocument>;
    let tokenMetadataModel: Model<ITokenMetadataDocument>;
    let userModel: Model<IUserDocument>;
    let client: IClientLeanDocument;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, ExternalModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        cryptService = app.get(CryptService);
        storageService = app.get(StorageService);
        usersService = app.get(UsersService);
        clientsService = app.get(ClientsService);
        configService = app.get(ConfigService);
        clientSecretEncrypted = cryptService.encrypt(clientSecret);
        httpService = app.get<HttpService>(HTTP_SERVICE);
        collectibleModel = app.get(getModelToken(DaoModelNames.externalCollectible));
        contractMetadataModel = app.get(getModelToken(DaoModelNames.contractMetadata));
        tokenMetadataModel = app.get(getModelToken(DaoModelNames.tokenMetadata));
        userModel = app.get(getModelToken(DaoModelNames.user));
    });

    beforeEach(async () => {
        client = await createClient(
            dbConnection,
            { clientId, clientSecret: clientSecretEncrypted, name: 'test' }
        );

        jest.spyOn(httpService, 'getFileBufferFromUrl').mockResolvedValue(Buffer.from('test'));

        const s3Res = {
            provider: 's3',
            key: 'key',
            location: 'location.png',
            etag: 'etag',
            bucket: 'bucket',
            mimetype: 'image/png',
            extension: 'png'
        };
        jest.spyOn(storageService, 'save').mockResolvedValue(s3Res);
        jest.spyOn(storageService, 'upload').mockResolvedValue(s3Res);
        jest.spyOn(storageService, 'remove').mockResolvedValue(null);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    describe('[POST] /external/collectibles (e2e)', () => {
        const method = 'POST';
        const path = '/external/collectibles';
        const getBody = () => ({
            externalCollectibleId: 'externalCollectibleId_1',
            externalCreatorId: 'externalCreatorId_1',
            externalCreatorEmail: 'externalCreatorEmail@gmail.com',
            maxSupply: 20,
            metadata: {
                name: 'firstCollectible 1',
                image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0EX1CiWNlGv3uaYmRVc7RdVR9FNyHK' +
                    'esX-3xXH_jqpS5TC6LvVeCD18S3lAkFWQlW0NA&usqp=CAU'
            }
        });

        it('should store new collectible', async () => {
            const dataCollectibles = await collectibleModel.find();
            expect(dataCollectibles.length).toBe(0);
            const dataContractMetadata = await contractMetadataModel.find();
            expect(dataContractMetadata.length).toBe(0);
            const dataTokenMetadata = await tokenMetadataModel.find();
            expect(dataTokenMetadata.length).toBe(0);

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                getBody()
            );

            const res = await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.OK);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.id.length).toBeGreaterThan(0);

            const checkCollectibles = await collectibleModel.find();
            expect(checkCollectibles.length).toBe(1);
            const [createdCollectible] = checkCollectibles;
            expect(createdCollectible).toBeDefined();
            expect(createdCollectible.id).toBeDefined();
            expect(createdCollectible.id).toBe(res.body.id);
            expect(createdCollectible.clientId.toString()).toBe(client._id.toString());
            expect(createdCollectible.externalCollectibleId).toBe(req.body.externalCollectibleId);
            expect(createdCollectible.externalCreatorId).toBe(req.body.externalCreatorId);
            expect(createdCollectible.externalCreatorEmail).toBe(req.body.externalCreatorEmail);
            expect(createdCollectible.maxSupply).toBe(req.body.maxSupply);
            expect(createdCollectible.distributedCount).toBe(0);
            expect(createdCollectible.tokenMetadataId).toBeDefined();
            expect(createdCollectible.tokenMetadataId.toString().length).toBeGreaterThan(0);

            const checkTokensMetadata = await tokenMetadataModel.find();
            expect(checkTokensMetadata.length).toBe(1);
            const [createdTokenMetadata] = checkTokensMetadata;
            expect(createdTokenMetadata).toBeDefined();
            expect(createdTokenMetadata.id).toBeDefined();
            expect(createdTokenMetadata.id).toBe(createdCollectible.tokenMetadataId.toString());
            expect(createdTokenMetadata.tokenCollectionId).toBeNull();
            expect(createdTokenMetadata.contractAddress).toBeNull();
            expect(createdTokenMetadata.token_identifier).toBe(1);
            expect(createdTokenMetadata.image.location.length).toBeGreaterThan(0);
            expect(createdTokenMetadata.name).toBe(req.body.metadata.name);
            expect(createdTokenMetadata.contractMetadataId).toBeDefined();
            expect(createdTokenMetadata.contractMetadataId.toString().length).toBeGreaterThan(0);

            const checkContractMetadata = await contractMetadataModel.find();
            expect(checkContractMetadata.length).toBe(1);
            const [createdContractMetadata] = checkContractMetadata;
            expect(createdContractMetadata).toBeDefined();
            expect(createdContractMetadata.id).toBeDefined();
            expect(createdContractMetadata.id).toBe(createdTokenMetadata.contractMetadataId.toString());
            expect(createdContractMetadata.name).toBe(client.name);
        });

        it('should store new collectible in existing contract meta', async () => {
            const dataCollectibles = await collectibleModel.find();
            expect(dataCollectibles.length).toBe(0);
            const dataTokenMetadata = await tokenMetadataModel.find();
            expect(dataTokenMetadata.length).toBe(0);

            const { marketPlacePrivateKey } = configService.get<IBlockchainConfig>('blockchain');
            const marketPlaceUser = await usersService.findOrCreateUserByEthAddress(
                getAddressFromPrivateKey(marketPlacePrivateKey)
            );
            const contractSlug = clientsService.getSlugByClient(client as IClientDocument);
            const contractMetadata = await contractMetadataModel.create({
                userId: marketPlaceUser.id,
                slug: contractSlug,
                name: client.name
            });
            const dataContractMetadata = await contractMetadataModel.find();
            expect(dataContractMetadata.length).toBe(1);
            const [check] = dataContractMetadata;
            expect(check.id).toBe(contractMetadata.id);

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                getBody()
            );

            const res = await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.OK);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.id.length).toBeGreaterThan(0);

            const createdCollectible = await collectibleModel.findById(res.body.id);
            expect(createdCollectible).toBeDefined();
            expect(createdCollectible.tokenMetadataId).toBeDefined();
            expect(createdCollectible.tokenMetadataId.toString().length).toBeGreaterThan(0);

            const createdTokenMetadata = await tokenMetadataModel.findById(
                createdCollectible.tokenMetadataId.toString()
            );
            expect(createdTokenMetadata.contractMetadataId).toBeDefined();
            expect(createdTokenMetadata.contractMetadataId.toString().length).toBeGreaterThan(0);

            const checkContractMetadataData = await contractMetadataModel.find();
            expect(checkContractMetadataData.length).toBe(1);
            const [checkContractMetadata] = checkContractMetadataData;
            expect(checkContractMetadata).toBeDefined();
            expect(checkContractMetadata.id).toBe(contractMetadata.id);
        });

        it('should store new collectible with next token identifier', async () => {
            const { marketPlacePrivateKey } = configService.get<IBlockchainConfig>('blockchain');
            const marketPlaceUser = await usersService.findOrCreateUserByEthAddress(
                getAddressFromPrivateKey(marketPlacePrivateKey)
            );
            const contractSlug = clientsService.getSlugByClient(client as IClientDocument);
            const contractMetadata = await contractMetadataModel.create({
                userId: marketPlaceUser.id,
                slug: contractSlug,
                name: client.name
            });
            const dataContractMetadata = await contractMetadataModel.find();
            expect(dataContractMetadata.length).toBe(1);
            const [check] = dataContractMetadata;
            expect(check.id).toBe(contractMetadata.id);

            await tokenMetadataModel.collection.insertOne({
                contractMetadataId: contractMetadata._id,
                token_identifier: 1,
            });

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                getBody()
            );

            const res = await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.OK);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.id.length).toBeGreaterThan(0);

            const createdCollectible = await collectibleModel.findById(res.body.id);
            expect(createdCollectible).toBeDefined();
            expect(createdCollectible.tokenMetadataId).toBeDefined();
            expect(createdCollectible.tokenMetadataId.toString().length).toBeGreaterThan(0);

            const createdTokenMetadata = await tokenMetadataModel.findById(
                createdCollectible.tokenMetadataId.toString()
            );
            expect(createdTokenMetadata.token_identifier).toBeDefined();
            expect(createdTokenMetadata.token_identifier).toBe(2);
        });

        it('should return 401 without access token', async () => {
            const { req } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                getBody()
            );

            await request(server)
                .post(req.path)
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should return 401 with wrong access token', async () => {
            const { req } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                getBody()
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer wrongToken` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should return 400 without body externalCollectibleId', async () => {
            const body = getBody();
            delete body.externalCollectibleId;

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body externalCollectibleId', async () => {
            const body = getBody();
            body.externalCollectibleId = null;

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body externalCreatorId', async () => {
            const body = getBody();
            body.externalCreatorId = null;

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body externalCreatorEmail', async () => {
            const body = getBody();
            body.externalCreatorEmail = 'wrong';

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body maxSupply', async () => {
            const body = getBody();
            body.maxSupply = 'wrong' as any;

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body metadata image', async () => {
            const body = getBody();
            body.metadata.image = 'wrong';

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with wrong body metadata name', async () => {
            const body = getBody();
            body.metadata.name = null;

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return 400 with existing collectible body', async () => {
            const body = getBody();

            await collectibleModel.collection.insertOne({
                clientId: client._id,
                externalCollectibleId: body.externalCollectibleId,
            });

            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path,
                undefined,
                body
            );

            const res = await request(server)
                .post(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .send(req.body)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res).toBeDefined();
            expect(res.body).toBeDefined();
            expect(res.body.message).toBeDefined();
            expect(res.body.message).toBe(Errors.COLLECTIBLE_EXISTS);
        });
    });

    describe('[GET] /external/collectibles/:id (e2e)', () => {
        const method = 'GET';
        const path = (collectibleId) => `/external/collectibles/${collectibleId}`;
        const contractMetadataSlug = 'test-collectible-1';

        let tokenMetadata: ITokenMetadataLeanDocument,
            collectible: ICollectibleLeanDocument;

        beforeEach(async () => {
            const marketPlaceUser = await userModel.create({ ethAddress: 'test' }) as IUser;

            const data = await prepareExternalCollectible(
                dbConnection,
                client,
                marketPlaceUser,
                contractMetadataSlug
            );
            tokenMetadata = data.tokenMetadata;
            collectible = data.collectible;
        });

        it('should retrieve collectible by id', async () => {
            const { req, token } = getExternalAccessToken(clientId, clientSecret, method, path(collectible._id));

            const res = await request(server)
                .get(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .expect(HttpStatus.OK);

            expect(res.body).toBeDefined();
            expect(res.body.id).toBeDefined();
            expect(res.body.id).toBe(collectible._id.toString());
            expect(res.body.externalCollectibleId).toBeDefined();
            expect(res.body.externalCollectibleId).toBe(collectible.externalCollectibleId.toString());
            expect(res.body.externalCreatorId).toBeDefined();
            expect(res.body.externalCreatorId).toBe(collectible.externalCreatorId.toString());
            expect(res.body.externalCreatorEmail).toBeDefined();
            expect(res.body.externalCreatorEmail).toBe(collectible.externalCreatorEmail.toString());
            expect(res.body.maxSupply).toBeDefined();
            expect(res.body.maxSupply).toBe(collectible.maxSupply);
            expect(res.body.distributedCount).toBeDefined();
            expect(res.body.distributedCount).toBe(collectible.distributedCount);
            expect(res.body.metadata).toBeDefined();
            expect(res.body.metadata.name).toBeDefined();
            expect(res.body.metadata.name).toBe(tokenMetadata.name);
            expect(res.body.metadata.image).toBeDefined();
            expect(res.body.metadata.image).toBe(tokenMetadata.image.location);
        });

        it('should return 401 without access token', async () => {
            const { req } = getExternalAccessToken(clientId, clientSecret, method, path(collectible._id));

            await request(server)
                .get(req.path)
                .query(req.query)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should return 401 with wrong access token', async () => {
            const { req } = getExternalAccessToken(clientId, clientSecret, method, path(collectible._id));

            await request(server)
                .get(req.path)
                .set({ Authorization: `Bearer wrongToken` })
                .query(req.query)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should return 404 with not exist collectibleId', async () => {
            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path(new ObjectID().toString())
            );

            await request(server)
                .get(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('should return 404 with wrong collectibleId', async () => {
            const { req, token } = getExternalAccessToken(
                clientId,
                clientSecret,
                method,
                path('wrongCollectibleId')
            );

            await request(server)
                .get(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('should return 404 with request someone else collectible', async () => {
            const { req, token } = getExternalAccessToken(clientId, clientSecret, method, path(collectible._id));

            await collectibleModel.findByIdAndUpdate(
                collectible._id.toString(),
                { clientId: new ObjectID().toString() }
            );

            const res = await request(server)
                .get(req.path)
                .set({ Authorization: `Bearer ${token}` })
                .query(req.query)
                .expect(HttpStatus.NOT_FOUND);
        });
    });
});
