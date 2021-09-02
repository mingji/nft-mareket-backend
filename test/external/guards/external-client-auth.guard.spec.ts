import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createClient,
    getExternalAccessToken,
    shutdownTest
} from '../../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClientsService } from '../../../src/external/clients/clients.service';
import { v4 as uuidv4 } from 'uuid';
import { CryptService } from '../../../src/crypt/crypt.service';
import { IEncryptedData } from '../../../src/types/scheme';
import { AuthModule } from '../../../src/auth/auth.module';
import { ExternalClientStrategy } from '../../../src/auth/strategies/external-client.strategy';
import { AuthService } from '../../../src/auth/auth.service';
import { ExternalAuth } from '../../../src/config/types/constants';
import { UnauthorizedException } from '@nestjs/common';

describe('ExternalClientAuthGuard', () => {
    const clientId = uuidv4();
    const clientSecret = 'clientSecret';
    let clientSecretEncrypted: IEncryptedData;
    let app: TestingModule;
    let dbConnection: Connection;
    let externalClientStrategy: ExternalClientStrategy;
    let clientsService: ClientsService;
    let authService: AuthService;
    let cryptService: CryptService;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), AuthModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        externalClientStrategy = app.get(ExternalClientStrategy);
        clientsService = app.get(ClientsService);
        cryptService = app.get(CryptService);
        authService = app.get(AuthService);
        clientSecretEncrypted = cryptService.encrypt(clientSecret);
    });

    beforeEach(async () => {
        await createClient(
            dbConnection,
            { clientId, clientSecret: clientSecretEncrypted, name: 'test' }
        );
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(externalClientStrategy).toBeDefined();
    });

    it('should return auth client', async () => {
        const { req, token } = getExternalAccessToken(clientId, clientSecret, 'GET', '/test');

        const authClient = await externalClientStrategy.validate(req as any, token);
        expect(authClient).toBeDefined();
        expect(authClient.id).toBeDefined();
        expect(authClient.id.length).toBeGreaterThan(0);
        expect(authClient.clientId).toBeDefined();
        expect(authClient.clientId).toBe(clientId);
    });

    it('should return auth client when time sub 1 min', async () => {
        const { req, token } = getExternalAccessToken(
            clientId,
            clientSecret,
            'GET',
            '/test',
            { time: new Date(new Date().getTime() - 60000).toISOString() }
        );

        const authClient = await externalClientStrategy.validate(req as any, token);
        expect(authClient).toBeDefined();
        expect(authClient.id).toBeDefined();
        expect(authClient.id.length).toBeGreaterThan(0);
        expect(authClient.clientId).toBeDefined();
        expect(authClient.clientId).toBe(clientId);
    });

    it('should throw UnauthorizedException with wrong clintId query param', async () => {
        const { req, token } = getExternalAccessToken('clientId', clientSecret, 'GET', '/test');
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with null clintId query param', async () => {
        const { req, token } = getExternalAccessToken(null, clientSecret, 'GET', '/test');
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException without clintId query param', async () => {
        const { req, token } = getExternalAccessToken(clientId, clientSecret, 'GET', '/test');
        delete req.query.clientId;
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with expired time query', async () => {
        const { req, token } = getExternalAccessToken(
            clientId,
            clientSecret,
            'GET',
            '/test',
            {
                time: new Date(
                    new Date().getTime() - (ExternalAuth.TOKEN_ALLOWED_MINUTES + 1) * 60000
                ).toISOString()
            }
        );
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with future time query', async () => {
        const { req, token } = getExternalAccessToken(
            clientId,
            clientSecret,
            'GET',
            '/test',
            {
                time: new Date(new Date().getTime() + 5 * 60000).toISOString()
            }
        );
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException without time query param', async () => {
        const { req, token } = getExternalAccessToken(clientId, clientSecret, 'GET', '/test');
        delete req.query.time;
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with wrong time query param', async () => {
        const { req, token } = getExternalAccessToken(
            clientId,
            clientSecret,
            'GET',
            '/test',
            { time: 'wrong' }
        );
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with not existing clientId', async () => {
        const { req, token } = getExternalAccessToken(uuidv4(), clientSecret, 'GET', '/test');
        const spy = jest.spyOn(clientsService, 'findByClientId');
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
        await expect(spy.mock.results[0].value).resolves.toBeNull();
    });

    it('should throw UnauthorizedException with wrong client secret', async () => {
        const { req, token } = getExternalAccessToken(uuidv4(), 'wrong', 'GET', '/test');
        const spy = jest.spyOn(authService, 'validateExternalClient');
        await expect(externalClientStrategy.validate(req as any, token)).rejects.toThrow(UnauthorizedException);
        await expect(spy.mock.results[0].value).resolves.toBeNull();
    });
});
