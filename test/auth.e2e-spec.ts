import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserSignatureRequestsService } from '../src/signTypeData/user-signature-requests.service';
import { Connection, Model } from 'mongoose';
import { IUserDocument } from '../src/users/schemas/user.schema';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../src/types/constants';
import { v4 as uuidv4 } from 'uuid';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    getContextId,
    prepareDb,
    shutdownTest,
    TEST_USER_ARKANE_WALLET_ADDRESS,
    TEST_USER_ETH_ADDRESS
} from './lib';
import { AuthModule } from '../src/auth/auth.module';
import { UserSignatureRequestDao } from '../src/signTypeData/dao/user-signature-request.dao';
import { WalletType } from '../src/signTypeData/types/sign-scheme';

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let userModel: Model<IUserDocument>;
    let dbConnection: Connection;

    const getUserSignatureRequestsDao = async (): Promise<UserSignatureRequestDao | null> => {
        if (!moduleFixture) {
            return null;
        }
        return await moduleFixture.resolve(UserSignatureRequestDao, getContextId());
    };

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();

        userModel = app.get(getModelToken(DaoModelNames.user));
        dbConnection = app.get(getConnectionToken());
    });

    beforeEach(async () => {
        await prepareDb(app, dbConnection);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    describe('Metamask auth (e2e)', () => {
        const getUserSignatureRequestsService = async (): Promise<UserSignatureRequestsService | null> => {
            if (!moduleFixture) {
                return null;
            }
            return await moduleFixture.resolve(UserSignatureRequestsService, getContextId());
        };
        const mockSignatureRequest = (
            userSignatureRequestsService: UserSignatureRequestsService
        ): void => {
            jest.spyOn(userSignatureRequestsService, 'getReqId').mockImplementation(() => requestId);
        };

        const requestId = '176109f7-1c02-4c5a-949c-a87f3863b9a8';
        const signature =
            '0x40d841a4bff13ad741f80c6a301f15cc5f2e2738e426c0a64de2b42f57cd4d01104d2fd5f9215e89c2f55' +
            'd963037a5a6ce7455f4fa2a5984a62f19139cac98221b';
        const ethAddress = TEST_USER_ETH_ADDRESS;

        it('/auth/signature should get signature', async () => {
            const signRes = await request(app.getHttpServer()).get('/auth/signature/metamask')
                .expect(HttpStatus.OK);

            expect(signRes.body).toBeDefined();
            expect(signRes.body).toBeInstanceOf(Object);
            expect(signRes.body.types).toBeDefined();
            expect(signRes.body.types).toBeInstanceOf(Object);
            expect(signRes.body.primaryType).toBeDefined();
            expect(signRes.body.primaryType.length).toBeGreaterThan(0);
            expect(signRes.body.domain).toBeDefined();
            expect(signRes.body.domain).toBeInstanceOf(Object);
            expect(signRes.body.domain.reqId).toBeDefined();
            expect(signRes.body.domain.reqId.length).toBeGreaterThan(0);
            expect(signRes.body.message).toBeDefined();
            expect(signRes.body.message).toBeInstanceOf(Object);
        });

        it('/auth/login should get JWT token successfully by signature', async () => {
            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            const user = await userModel.findOne({ ethAddress });

            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId })
                .expect(HttpStatus.CREATED);

            expect(loginRes.body).toBeDefined();
            expect(loginRes.body.accessToken).toBeDefined();
            expect(loginRes.body.accessToken.length).toBeGreaterThan(0);
            expect(loginRes.body.userId).toBeDefined();
            expect(loginRes.body.userId).toBe(user.id);
        });

        it('/auth/login should return bad request response without address and reqId', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return bad request response with wrong type reqId', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId: 'wrong_requestId' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return bad request response with wrong type address', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: 'wrong_address', requestId })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return unauthorized response without post body', async () => {
            await request(app.getHttpServer()).post('/auth/login').expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should return unauthorized response by wrong requestId', async () => {
            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId: uuidv4() })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should return unauthorized response by expired requestId', async () => {
            const userSignatureRequestsDao = await getUserSignatureRequestsDao();
            mockSignatureRequest(await getUserSignatureRequestsService());
            jest.spyOn(userSignatureRequestsDao, 'storeUserSignatureRequest').mockImplementation(function(
                walletType: WalletType,
                requestId,
                expireAt,
                message
            ) {
                return this.userSignatureRequestModel.create({
                    walletType,
                    requestId,
                    expireAt: new Date().getTime() - 1000,
                    message
                });
            });

            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should return unauthorized response by wrong ethAddress', async () => {
            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: '0x9CAF7fFe11dD8E23e5026563C29e6B7968382EC5', requestId })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should create new user and return JWT token', async () => {
            await clearDb(dbConnection);
            expect(await userModel.findOne({ ethAddress })).toBeNull();

            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId })
                .expect(HttpStatus.CREATED);

            expect(await userModel.findOne({ ethAddress })).toBeInstanceOf(Object);
        });

        it('/auth/login should return JWT token existing user', async () => {
            let existingUser = await userModel.find({ ethAddress });
            expect(existingUser.length).toEqual(1);

            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/metamask').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: ethAddress, requestId })
                .expect(HttpStatus.CREATED);

            existingUser = await userModel.find({ ethAddress });
            expect(existingUser.length).toEqual(1);
        });
    });

    describe('Arkane auth (e2e)', () => {
        const getUserSignatureRequestsService = async (): Promise<UserSignatureRequestsService | null> => {
            if (!moduleFixture) {
                return null;
            }
            return await moduleFixture.resolve(UserSignatureRequestsService, getContextId());
        };
        const mockSignatureRequest = (
            userSignatureRequestsService: UserSignatureRequestsService
        ): void => {
            jest.spyOn(userSignatureRequestsService, 'getReqId').mockImplementation(() => requestId);
        };

        const requestId = 'eb516df2-f2be-4086-8ae2-9b99f412bd75';
        const signature =
            '0x9a983a5b5de1a99e8251a8ec7083d0fabe83a345b0731e80da87807f28099b1d1a579cbdd32953b70f31d8b46991ce58' +
            'c66659ccc2c41d8f8f98e132cd752a1e1b';

        it('/auth/signature/arkane should get signature', async () => {
            const signRes = await request(app.getHttpServer()).get('/auth/signature/arkane')
                .expect(HttpStatus.OK);

            expect(signRes.body).toBeDefined();
            expect(signRes.body).toBeInstanceOf(Object);
            expect(signRes.body.types).toBeDefined();
            expect(signRes.body.types).toBeInstanceOf(Object);
            expect(signRes.body.primaryType).toBeDefined();
            expect(signRes.body.primaryType.length).toBeGreaterThan(0);
            expect(signRes.body.domain).toBeDefined();
            expect(signRes.body.domain).toBeInstanceOf(Object);
            expect(signRes.body.domain.salt).toBeDefined();
            expect(signRes.body.domain.salt.length).toBeGreaterThan(0);
            expect(signRes.body.message).toBeDefined();
            expect(signRes.body.message).toBeInstanceOf(Object);
        });

        it('/auth/login should get JWT token successfully by signature', async () => {
            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/arkane').expect(HttpStatus.OK);

            const user = await userModel.create({ ethAddress: TEST_USER_ARKANE_WALLET_ADDRESS });

            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: TEST_USER_ARKANE_WALLET_ADDRESS, requestId })
                .expect(HttpStatus.CREATED);

            expect(loginRes.body).toBeDefined();
            expect(loginRes.body.accessToken).toBeDefined();
            expect(loginRes.body.accessToken.length).toBeGreaterThan(0);
            expect(loginRes.body.userId).toBeDefined();
            expect(loginRes.body.userId).toBe(user.id);
        });

        it('/auth/login should return bad request response without address and reqId', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return bad request response with wrong type reqId', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: TEST_USER_ARKANE_WALLET_ADDRESS, requestId: 'wrong_requestId' })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return bad request response with wrong type address', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: 'wrong_address', requestId })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('/auth/login should return unauthorized response by wrong requestId', async () => {
            await request(app.getHttpServer()).get('/auth/signature/arkane').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: TEST_USER_ARKANE_WALLET_ADDRESS, requestId: uuidv4() })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should return unauthorized response by expired requestId', async () => {
            const userSignatureRequestsDao = await getUserSignatureRequestsDao();
            mockSignatureRequest(await getUserSignatureRequestsService());
            jest.spyOn(userSignatureRequestsDao, 'storeUserSignatureRequest').mockImplementation(function(
                walletType: WalletType,
                requestId,
                expireAt,
                message
            ) {
                return this.userSignatureRequestModel.create({
                    walletType,
                    requestId,
                    expireAt: new Date().getTime() - 1000,
                    message
                });
            });

            await request(app.getHttpServer()).get('/auth/signature/arkane').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: TEST_USER_ARKANE_WALLET_ADDRESS, requestId })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should return unauthorized response by wrong ethAddress', async () => {
            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/arkane').expect(HttpStatus.OK);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: '0x9CAF7fFe11dD8E23e5026563C29e6B7968382EC5', requestId })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('/auth/login should create new user and return JWT token', async () => {
            await clearDb(dbConnection);
            expect(await userModel.findOne({ ethAddress: TEST_USER_ARKANE_WALLET_ADDRESS })).toBeNull();

            mockSignatureRequest(await getUserSignatureRequestsService());

            await request(app.getHttpServer()).get('/auth/signature/arkane').expect(HttpStatus.OK);

            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ signature, address: TEST_USER_ARKANE_WALLET_ADDRESS, requestId })
                .expect(HttpStatus.CREATED);

            const user = await userModel.findOne({ ethAddress: TEST_USER_ARKANE_WALLET_ADDRESS });

            expect(user).toBeInstanceOf(Object);
            expect(res.body).toBeDefined();
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.accessToken.length).toBeGreaterThan(0);
            expect(res.body.userId).toBeDefined();
            expect(res.body.userId).toBe(user.id);
        });
    });
});
