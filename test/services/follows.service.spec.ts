import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createFollow,
    IUser,
    prepareFollows,
    shutdownTest
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { FollowsModule } from '../../src/follows/follows.module';
import { FollowsService } from '../../src/follows/follows.service';
import { FollowTypeRefField, IFollowDocument } from '../../src/follows/schemas/follows.schema';
import { ObjectID } from 'mongodb';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { FollowType } from '../../src/follows/types/enums';

describe('FollowsService', () => {
    let app: TestingModule;
    let dbConnection: Connection;
    let followsService: FollowsService;
    let followModel: Model<IFollowDocument>;
    let userModel: Model<IUserDocument>;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), FollowsModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        followsService = app.get(FollowsService);
        followModel = app.get(getModelToken(DaoModelNames.follow));
        userModel = app.get(getModelToken(DaoModelNames.user));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(followsService).toBeDefined();
    });

    it('[existFollow] should return true', async () => {
        const userId = new ObjectID().toString();
        const followUserId = new ObjectID().toString();
        await createFollow(dbConnection, userId, followUserId);

        const check = await followsService.existFollow(userId, followUserId);
        expect(check).toBeTruthy();
    });

    it('[existFollow] should return false', async () => {
        const userId = new ObjectID().toString();
        const followUserId = new ObjectID().toString();

        const check = await followsService.existFollow(userId, followUserId);
        expect(check).toBeFalsy();
    });

    it('[storeNewFollow] should store new follow', async () => {
        const userId = new ObjectID().toString();
        const followUserId = new ObjectID().toString();

        const res = await followsService.storeNewFollow(userId, followUserId);

        expect(res).toBeDefined();
        expect(res.id).toBeDefined();
        expect(res.id.length).toBeGreaterThan(0);
        expect(res.userId.toString()).toBe(userId);
        expect(res.followUserId.toString()).toBe(followUserId);
    });

    it('[removeFollow] should remove follow', async () => {
        const userId = new ObjectID().toString();
        const followUserId = new ObjectID().toString();

        await createFollow(dbConnection, userId, followUserId);

        const follow = await followModel.findOne({ userId, followUserId });
        expect(follow).toBeDefined();

        await followsService.removeFollow(userId, followUserId);

        const check = await followModel.findOne({ userId, followUserId });
        expect(check).toBeNull();
    });

    it('[getFollowsByTypeAndUserId] should return followings by user', async () => {
        const user = await userModel.create({ ethAddress: 'test' });
        const type = FollowType.FOLLOWINGS;
        const refUserField = FollowTypeRefField[type];

        const { followingData } = await prepareFollows(dbConnection, user as IUser);
        const followingsCount = followingData.length;

        const res = await followsService.getFollowsByTypeAndUserId(
            type,
            user.id,
            { offset: 0, limit: 20 }
        );

        expect(res).toBeDefined();
        expect(res.data).toBeDefined();
        expect(res.total).toBeDefined();
        expect(res.offset).toBeDefined();
        expect(res.limit).toBeDefined();
        expect(res.data.length).toBe(followingsCount);
        expect(res.total).toBe(followingsCount);

        res.data.forEach(f => {
            expect(f[refUserField].id).toBeDefined();
            expect(f[refUserField].id.length).toBeGreaterThan(0);
            expect(f[refUserField].ethAddress).toBeDefined();
            expect(f[refUserField].ethAddress.length).toBeGreaterThan(0);
        });
    });

    it('[getFollowsByTypeAndUserId] should return followers by user', async () => {
        const user = await userModel.create({ ethAddress: 'test' });
        const type = FollowType.FOLLOWERS;
        const refUserField = FollowTypeRefField[type];

        const { followersData } = await prepareFollows(dbConnection, user as IUser);
        const followersCount = followersData.length;

        const res = await followsService.getFollowsByTypeAndUserId(
            FollowType.FOLLOWERS,
            user.id,
            { offset: 0, limit: 20 }
        );

        expect(res).toBeDefined();
        expect(res.data).toBeDefined();
        expect(res.total).toBeDefined();
        expect(res.offset).toBeDefined();
        expect(res.limit).toBeDefined();
        expect(res.data.length).toBe(followersCount);
        expect(res.total).toBe(followersCount);

        res.data.forEach(f => {
            expect(f[refUserField].id).toBeDefined();
            expect(f[refUserField].id.length).toBeGreaterThan(0);
            expect(f[refUserField].ethAddress).toBeDefined();
            expect(f[refUserField].ethAddress.length).toBeGreaterThan(0);
        });
    });
});