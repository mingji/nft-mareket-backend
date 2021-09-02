import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    createFollow,
    expectPaginatedResponse,
    IUser,
    prepareDb,
    prepareFollows,
    shutdownTest
} from './lib';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../src/types/constants';
import { AuthModule } from '../src/auth/auth.module';
import { FollowsModule } from '../src/follows/follows.module';
import { IUserDocument } from '../src/users/schemas/user.schema';
import { FollowsService } from '../src/follows/follows.service';
import { Errors } from '../src/follows/types/errors';
import { ObjectID } from 'mongodb';
import { FollowType } from '../src/follows/types/enums';
import { IFollowDocument } from '../src/follows/schemas/follows.schema';

describe('FollowsController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let followsService: FollowsService;
    let defaultHeaders: { Authorization: string };
    let userModel: Model<IUserDocument>;
    let followModel: Model<IFollowDocument>;
    let user: IUser;
    let userId: string;
    let server: any;

    beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule, FollowsModule],
            providers: [...baseAppProviders()]
        }).compile();

        app = createApp(moduleFixture);
        await app.init();
        dbConnection = app.get(getConnectionToken());
        server = app.getHttpServer();
        userModel = app.get(getModelToken(DaoModelNames.user));
        followModel = app.get(getModelToken(DaoModelNames.follow));
        followsService = app.get(FollowsService);
    });

    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        userId = user._id.toString();
        defaultHeaders = { Authorization: `Bearer ${data.token}` };
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('/follows/users/:userId should store new follow', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        const checkFollow = await followsService.existFollow(userId, followUserId);
        expect(checkFollow).toBeFalsy();

        await request(server)
            .post(`/follows/users/${followUserId}`)
            .set(defaultHeaders)
            .expect(HttpStatus.CREATED);

        const checkFollowAfterReq = await followsService.existFollow(userId, followUserId);
        expect(checkFollowAfterReq).toBeTruthy();
    });

    it('/follows/users/:userId should return 401 without access token', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        await request(server)
            .post(`/follows/users/${followUserId}`)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('/follows/users/:userId should return 400 FOLLOW_EXISTS', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        await createFollow(dbConnection, userId, followUserId);

        const res = await request(server)
            .post(`/follows/users/${followUserId}`)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res).toBeDefined();
        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.FOLLOW_EXISTS);
    });

    it('/follows/users/:userId should return 404 with follow undefined user', async () => {
        await request(server)
            .post(`/follows/users/${new ObjectID().toString()}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('/follows/users/:userId should remove follow', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        await createFollow(dbConnection, userId, followUserId);

        const check = await followsService.existFollow(userId, followUserId);
        expect(check).toBeTruthy();

        await request(server)
            .delete(`/follows/users/${followUserId}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        const checkAfterReq = await followsService.existFollow(userId, followUserId);
        expect(checkAfterReq).toBeFalsy();
    });

    it('/follows/users/:userId unfollow should return 401 without access token', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        await request(server)
            .delete(`/follows/users/${followUserId}`)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('/follows/users/:userId unfollow should return 400 FOLLOW_DOES_NOT_EXISTS', async () => {
        const followUser = await userModel.create({ ethAddress: 'test' });
        const followUserId = followUser.id;

        const res = await request(server)
            .delete(`/follows/users/${followUserId}`)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);

        expect(res).toBeDefined();
        expect(res.body).toBeDefined();
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toBe(Errors.FOLLOW_DOES_NOT_EXISTS);
    });

    it('/follows/users/:userId should return 404 with unfollow undefined user', async () => {
        await request(server)
            .delete(`/follows/users/${new ObjectID().toString()}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('/users/:userId/:type should return user followings', async () => {
        const { followingData } = await prepareFollows(dbConnection, user as IUser);
        const followingsCount = followingData.length;

        const res = await request(server)
            .get(`/users/${userId}/${FollowType.FOLLOWINGS}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);

        expect(res.body.data.length).toBe(followingsCount);
        expect(res.body.total).toBe(followingsCount);
        res.body.data.forEach(f => {
            expect(f.user.id).toBeDefined();
            expect(f.user.id.length).toBeGreaterThan(0);
            expect(f.user.ethAddress).toBeDefined();
            expect(f.user.ethAddress.length).toBeGreaterThan(0);
        });
    });

    it('/users/:userId/:type should return user followers', async () => {
        const { followersData } = await prepareFollows(dbConnection, user as IUser);
        const followersCount = followersData.length;

        const res = await request(server)
            .get(`/users/${userId}/${FollowType.FOLLOWERS}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expectPaginatedResponse(res);

        expect(res.body.data.length).toBe(followersCount);
        expect(res.body.total).toBe(followersCount);
        res.body.data.forEach(f => {
            expect(f.user.id).toBeDefined();
            expect(f.user.id.length).toBeGreaterThan(0);
            expect(f.user.ethAddress).toBeDefined();
            expect(f.user.ethAddress.length).toBeGreaterThan(0);
        });
    });

    it('/users/:userId/:type should return 404 by undefined user', async () => {
        await request(server)
            .get(`/users/${new ObjectID().toString()}/${FollowType.FOLLOWERS}`)
            .set(defaultHeaders)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('/users/:userId/:type should return 400 by wrong type param', async () => {
        await request(server)
            .get(`/users/${userId}/undefined`)
            .set(defaultHeaders)
            .expect(HttpStatus.BAD_REQUEST);
    });

    it(
        '/users/:userId/:type should return user followings with following users count followers',
        async () => {
            const { followingData } = await prepareFollows(dbConnection, user as IUser);
            const followingsCount = followingData.length;

            const followData = await followModel.find().lean();

            const res = await request(server)
                .get(`/users/${userId}/${FollowType.FOLLOWINGS}`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            expect(res.body.data.length).toBe(followingsCount);
            expect(res.body.total).toBe(followingsCount);
            res.body.data.forEach(f => {
                    expect(f.user.id).toBeDefined();
                    expect(f.user.id.length).toBeGreaterThan(0);
                    expect(f.user.countFollowers).toBeDefined();
                    expect(f.user.countFollowers).toBeGreaterThan(0);
                    expect(f.user.countFollowers).toBe(
                        followData.filter(item => item.followUserId.toString() === f.user.id.toString()).length
                    );
                }
            );
        }
    );

    it(
        '/users/:userId/:type should return user followers with following users count followers',
        async () => {
            const { followersData } = await prepareFollows(dbConnection, user as IUser);
            const followersCount = followersData.length;

            const followData = await followModel.find().lean();

            const res = await request(server)
                .get(`/users/${userId}/${FollowType.FOLLOWERS}`)
                .set(defaultHeaders)
                .expect(HttpStatus.OK);

            expectPaginatedResponse(res);

            expect(res.body.data.length).toBe(followersCount);
            expect(res.body.total).toBe(followersCount);
            res.body.data.forEach(f => {
                    expect(f.user.id).toBeDefined();
                    expect(f.user.id.length).toBeGreaterThan(0);
                    expect(f.user.countFollowers).toBeDefined();
                    expect(f.user.countFollowers).toBe(
                        followData.filter(item => item.followUserId.toString() === f.user.id.toString()).length
                    );
                }
            );
        }
    );
});
