import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    createClient,
    shutdownTest
} from '../../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClientsService } from '../../../src/external/clients/clients.service';
import { ExternalModule } from '../../../src/external/external.module';
import { v4 as uuidv4 } from 'uuid';
import { CryptService } from '../../../src/crypt/crypt.service';
import { IEncryptedData } from '../../../src/types/scheme';
import { CryptModule } from '../../../src/crypt/crypt.module';

describe('ClientsService', () => {
    const clientId = uuidv4();
    const clientSecret = 'clientSecret';
    let clientSecretEncrypted: IEncryptedData;
    let app: TestingModule;
    let dbConnection: Connection;
    let clientsService: ClientsService;
    let cryptService: CryptService;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), ExternalModule, CryptModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        clientsService = app.get(ClientsService);
        cryptService = app.get(CryptService);
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
        expect(clientsService).toBeDefined();
    });

    it('[findByClientId] should return client', async () => {
        const client = await clientsService.findByClientId(clientId);
        expect(client).toBeDefined();
        expect(client.id).toBeDefined();
        expect(client.id.length).toBeGreaterThan(0);
        expect(client.clientSecret).toBeDefined();
        expect(client.clientSecret.content).toBeDefined();
        expect(client.clientSecret.content.length).toBeGreaterThan(0);
        expect(client.clientSecret.iv).toBeDefined();
        expect(client.clientSecret.iv.length).toBeGreaterThan(0);
    });
});