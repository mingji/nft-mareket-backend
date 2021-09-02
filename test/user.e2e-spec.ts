import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Model } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import slugify from 'slugify';
import * as nodemailer from "nodemailer";
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createApp,
    createRandomUser,
    IUser,
    prepareDb,
    shutdownTest
} from './lib';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { StorageService } from '../src/utils/storage.service';
import { UtilsModule } from '../src/utils/utils.module';
import { Errors } from '../src/users/types/errors';
import { ObjectID } from 'mongodb';
import { IUserDocument } from '../src/users/schemas/user.schema';
import { DaoModelNames } from '../src/types/constants';

jest.mock("nodemailer", () => ({
    createTransport: () => ({
        sendMail: jest.fn(),
    }),
}));

describe('UserController (e2e)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;
    let dbConnection: Connection;
    let userModel: Model<IUserDocument>;
    let user: IUser;
    let defaultHeaders: { Authorization: string };
    let server: any;

    const storageServiceMock = {
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
            imports: [...baseAppModules(), AuthModule, UtilsModule, UsersModule],
            providers: [...baseAppProviders()]
        })
            .overrideProvider(StorageService).useValue(storageServiceMock)
            .compile();

        app = createApp(moduleFixture);
        server = app.getHttpServer();
        userModel = app.get(getModelToken(DaoModelNames.user));
        await app.init();
        dbConnection = app.get(getConnectionToken());
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

    it('put /users/:id should return 200 after update', async () => {
        const links = {
            website: 'https://usersite.example.com',
            twitter: 'profile',
            medium: 'medium',
            telegram: 'telegram',
            discord: 'discord'
        };
        const data = {
            name: 'User Display Name',
            description: 'User description',
            slug: 'user-slug',
            links: JSON.stringify(links)
        };
        const res = await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .field(data)
            .attach('avatar', './test/files/img1.jpg')
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.name).toEqual(data.name);
        expect(res.body.description).toEqual(data.description);
        expect(res.body.slug).toEqual(slugify(data.slug));
        expect(res.body.links).toEqual(links);
        expect(res.body.avatar).toBeDefined();
    });

    it('put /users/:id should return 200 without body slug', async () => {
        const data = { name: 'User Display Name' };
        const res = await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .field(data)
            .attach('avatar', './test/files/img1.jpg')
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.name).toEqual(data.name);
    });

    it('put /users/:id should return 200 without avatar', async () => {
        const links = {
            website: 'https://usersite.example.com',
            twitter: 'profile',
            medium: 'medium',
            telegram: 'telegram',
            discord: 'discord'
        };
        const data = {
            name: 'User Display Name',
            description: 'User description',
            slug: 'user-slug',
            links
        };
        const res = await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.name).toEqual(data.name);
        expect(res.body.description).toEqual(data.description);
        expect(res.body.slug).toEqual(slugify(data.slug));
        expect(res.body.links).toEqual(links);
    });


    it('put /users/:id should return 400 with exists slug', async () => {
        const data = {
            slug: 'user-slug'
        };
        await createRandomUser(dbConnection, { slug: slugify(data.slug), ethAddress: 'some_address' });
        const res = await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.BAD_REQUEST);
        expect(res.body.message).toEqual(Errors.USER_WITH_SLUG_EXISTS);
    });


    it('put /users/:id should return 400 with wrong slug format', async () => {
        const res = await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send({ slug: 'user slug' })
            .expect(HttpStatus.BAD_REQUEST);
    });


    it('put /users/:id should update user slug', async () => {
        const data = {
            slug: 'user-slug'
        };
        await userModel.updateOne({ _id: user._id }, { slug: slugify(data.slug) });
        await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);
    });


    it('put /users/:id should update user partly', async () => {
        const data = {
            name: 'Test'
        };
        await userModel.updateOne({ _id: user._id }, { slug: slugify('test slug') });
        await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);

        const updatedUser = await userModel.findOne({ _id: user._id });
        expect(updatedUser.slug).toBeDefined();
    });

    it('put /users/:id name and description can be empty', async () => {
        const data = {
            name: '',
            description: ''
        };
        await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);

        const updatedUser = await userModel.findOne({ _id: user._id });
        expect(updatedUser.name.length).toEqual(0);
        expect(updatedUser.description.length).toEqual(0);
    });


    it('put /users/:id should return 404 when edit other user', async () => {
        const data = {
            name: 'hackerman'
        };
        const createdUser = await createRandomUser(dbConnection, { slug: 'random', ethAddress: 'ethAddress' });
        await request(app.getHttpServer())
            .put(`/users/${createdUser._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('get /users/:id should return 404 user not found', async () => {
        await request(app.getHttpServer())
            .get(`/users/${new ObjectID().toString()}`)
            .expect(HttpStatus.NOT_FOUND);
    });

    it('get /users/:id should return user data', async () => {
        const res = await request(app.getHttpServer())
            .get(`/users/${user._id.toString()}`)
            .set(defaultHeaders)
            .expect(HttpStatus.OK);

        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.id.length).toBeGreaterThan(0);
        expect(res.body.ethAddress).toBeDefined();
        expect(res.body.ethAddress.length).toBeGreaterThan(0);
    });

    it('put /users/:id should set slug to null with post null', async () => {
        const data = { slug: null };
        await userModel.findByIdAndUpdate(user._id.toString(), { slug: slugify('test-slug') });
        await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);

        const checkUser = await userModel.findById(user._id.toString());
        expect(checkUser.slug).toBeDefined();
        expect(checkUser.slug).toBeNull();
    });

    it('put /users/:id should set slug to null with post empty string', async () => {
        const data = { slug: '' };
        await userModel.updateOne({ _id: user._id }, { slug: slugify('test-slug') });
        await request(app.getHttpServer())
            .put(`/users/${user._id}`)
            .set(defaultHeaders)
            .send(data)
            .expect(HttpStatus.OK);

        const checkUser = await userModel.findById(user._id.toString());
        expect(checkUser.slug).toBeDefined();
        expect(checkUser.slug).toBeNull();
    });

    it('/users/:userId/report should return 201 for correct body', async () => {
        await request(server)
            .post(`/users/${user._id}/report`)
            .set(defaultHeaders)
            .send({ email: 'test@test.com', message: "Hey everyone!", walletAddress: '123', link: 'test.com/' })
            .expect(HttpStatus.CREATED);
    });

    it ('/users/:userId/report should return 400 with incorrect email', async () => {
        await request(server)
            .post(`/users/${user._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/:userId/report should return 400 with incorrect wallet address', async () => {
        await request(server)
            .post(`/users/${user._id}/report`)
            .set(defaultHeaders)
            .send({
                email: 'test@test.com',
                link: 'test.com/',
            })
            .expect(HttpStatus.BAD_REQUEST);
    });

    it('/users/:userId/report should return 400 with incorrect link', async () => {
        await request(server)
            .post(`/users/${user._id}/report`)
            .set(defaultHeaders)
            .send({
                walletAddress: '123',
                email: 'test@test.com'
            })
            .expect(HttpStatus.BAD_REQUEST);
    });
});
