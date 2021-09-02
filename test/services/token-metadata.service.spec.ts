import { Test } from "@nestjs/testing";
import { baseAppModules, baseAppProviders, clearDb, shutdownTest } from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { TokenMetadataService } from '../../src/metadata/services';
import { ITokenMetadataDocument } from '../../src/metadata/schemas/token-metadata.schema';
import { DaoModelNames } from '../../src/types/constants';
import { ObjectID } from 'mongodb';
import { MetadataModule } from '../../src/metadata/metadata.module';
import { Errors } from '../../src/metadata/types/errors';

describe('TokenMetadataService', () => {
    let app: TestingModule;
    let dbConnection: Connection;
    let tokenMetadataService: TokenMetadataService;
    let tokenMetadataModel: Model<ITokenMetadataDocument>;
    const s3Image = {
        provider: 's3',
        key: 'Key',
        location: 'location',
        etag: 'ETag',
        bucket: 'Bucket',
        mimetype: 'image/png',
        extension: 'png'
    };

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), MetadataModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        tokenMetadataService = app.get(TokenMetadataService);
        tokenMetadataModel = app.get(getModelToken(DaoModelNames.tokenMetadata));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(tokenMetadataService).toBeDefined();
    });

    it('[findMetadataByContractMetadataIdAndTokenIdentifier] should get tokenMetadata instance', async () => {
        const contractMetadataId = new ObjectID();
        const token_identifier = 99;
        const metadata = await tokenMetadataModel.create({
            tokenCollectionId: new ObjectID(),
            userId: new ObjectID(),
            contractMetadataId,
            contractAddress: 'contractAddress',
            token_identifier,
            image: {
                provider: 's3',
                key: 'Key',
                location: 'location',
                etag: 'ETag',
                bucket: 'Bucket',
                mimetype: 'image/png',
                extension: 'png'
            },
            description: 'description',
            name: 'name',
        });

        const res = await tokenMetadataService.findMetadataByContractMetadataIdAndTokenIdentifier(
            contractMetadataId.toString(),
            token_identifier
        );

        expect(res).toBeDefined();
        expect(res.id).toBeDefined();
        expect(res.id).toEqual(metadata.id);
    });

    it('[findMetadataByContractMetadataIdAndTokenIdentifier] should return null', async () => {
        expect(await tokenMetadataService.findMetadataByContractMetadataIdAndTokenIdentifier(
            new ObjectID().toString(),
            999
        )).toBeNull();
    });

    it('[getNextTokenIdentifier] should return next token identifier eq 1', async () => {
        const res = await tokenMetadataService.getNextTokenIdentifier(new ObjectID().toString());
        expect(res).toBeDefined();
        expect(res).toBe(1);
    });

    it('[getNextTokenIdentifier] should return next token identifier eq 2', async () => {
        const contractMetadataId = new ObjectID();
        await tokenMetadataModel.collection.insertOne({
            contractMetadataId,
            token_identifier: 1,
        });
        const res = await tokenMetadataService.getNextTokenIdentifier(contractMetadataId.toString());
        expect(res).toBeDefined();
        expect(res).toBe(2);
    });

    it('[getNextTokenIdentifier] should return next token identifier eq 3', async () => {
        const contractMetadataId = new ObjectID();
        await tokenMetadataModel.collection.insertMany([
            {
                contractMetadataId,
                token_identifier: 1,
            },
            {
                contractMetadataId,
                token_identifier: 2,
            },
            {
                contractMetadataId: new ObjectID(),
                token_identifier: 1,
            },
            {
                contractMetadataId: new ObjectID(),
                token_identifier: 1,
            },
        ]);
        const res = await tokenMetadataService.getNextTokenIdentifier(contractMetadataId.toString());
        expect(res).toBeDefined();
        expect(res).toBe(3);
    });

    it('[getNextTokenIdentifier] should return next token identifier eq 5', async () => {
        const contractMetadataId = new ObjectID();
        await tokenMetadataModel.collection.insertMany([
            {
                contractMetadataId,
                token_identifier: 4,
            },
            {
                contractMetadataId: new ObjectID(),
                token_identifier: 1,
            },
            {
                contractMetadataId: new ObjectID(),
                token_identifier: 1,
            },
        ]);
        const res = await tokenMetadataService.getNextTokenIdentifier(contractMetadataId.toString());
        expect(res).toBeDefined();
        expect(res).toBe(5);
    });

    it('[storeMetadata] should create metadata', async () => {
        jest.spyOn(tokenMetadataService, 'getNextTokenIdentifier').mockResolvedValue(5);

        const res = await tokenMetadataService.storeMetadata(
            new ObjectID().toString(),
            new ObjectID().toString(),
            new ObjectID().toString(),
            'contractAddress',
            'name',
            s3Image,
            null,
            null,
            null,
            'description'
        );

        expect(res).toBeDefined();
        expect(res.id).toBeDefined();
        expect(res.id.length).toBeGreaterThan(0);
    });

    it('[storeMetadata] should throw CAN_NOT_GET_NEXT_TOKEN_IDENTIFIER', async () => {
        jest.spyOn(tokenMetadataService, 'getNextTokenIdentifier').mockResolvedValue(null);

        await expect(
            tokenMetadataService.storeMetadata(
                new ObjectID().toString(),
                new ObjectID().toString(),
                new ObjectID().toString(),
                'contractAddress',
                'name',
                s3Image,
                null,
                null,
                null,
                'description'
            )
        ).rejects.toThrow(Errors.CAN_NOT_GET_NEXT_TOKEN_IDENTIFIER);
    });
});