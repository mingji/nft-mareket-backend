import { Test } from '@nestjs/testing';
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    EIP_TOKEN_BALANCES,
    EIP_TOKENS,
    IUser,
    prepareMetadata,
    randomCard,
    randomCollection,
    shutdownTest
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { TokenCollectionsModule } from '../../src/tokenCollections/token-collections.module';
import { TokenCollectionsService } from '../../src/tokenCollections/token-collections.service';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { StorageService } from '../../src/utils/storage.service';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { ITokenCollectionDocument } from '../../src/tokenCollections/schemas/token-collection.schema';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { ICardDocument } from '../../src/cards/schemas/cards.schema';
import { Errors } from '../../src/types/errors';
import { EIP, Network } from '../../src/config/types/constants';
import { ObjectID } from 'mongodb';
import { IContractMetadataDocument } from '../../src/metadata/schemas/contract-metadata.schema';

describe('TokenCollectionsService', () => {
    let tokenCollectionsService: TokenCollectionsService;
    let subgraphService: SubgraphService;
    let httpService: HttpService;
    let app: TestingModule;
    let dbConnection: Connection;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let cardModel: Model<ICardDocument>;
    let userModel: Model<IUserDocument>;
    let contractMetadataModel: Model<IContractMetadataDocument>;
    const contractId = 'contractId'.toLowerCase();
    const contactCreatorAddress = 'contact-creator-address'.toLowerCase();
    const contactName = 'contactName';
    const contactEipVersion = EIP.EIP_1155;
    const storageService = {
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
        removeMany: () => true
    };
    const mockEipSuccessResponse = () => {
        jest
            .spyOn(subgraphService, 'getTokenWithMetadataListFetch')
            .mockReturnValue(Promise.resolve(EIP_TOKENS));

        jest
            .spyOn(subgraphService, 'getAllBalancesByToken')
            .mockReturnValue(Promise.resolve(EIP_TOKEN_BALANCES));

        jest
            .spyOn(httpService, 'getFileBufferFromUrl')
            .mockReturnValue(Promise.resolve(Buffer.from('test')));
    }

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), TokenCollectionsModule],
            providers: [...baseAppProviders()]
        })
            .overrideProvider(StorageService).useValue(storageService)
            .compile();

        dbConnection = app.get(getConnectionToken());
        tokenCollectionsService = app.get(TokenCollectionsService);
        subgraphService = app.get(SubgraphService);
        httpService = app.get<HttpService>(HTTP_SERVICE);
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        cardModel = app.get(getModelToken(DaoModelNames.card));
        userModel = app.get(getModelToken(DaoModelNames.user));
        contractMetadataModel = app.get(getModelToken(DaoModelNames.contractMetadata));
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(tokenCollectionsService).toBeDefined();
    });

    it('[syncContract] should fetch contract and tokens', async () => {
        mockEipSuccessResponse();
        await tokenCollectionsService.syncContract(
            Network.ETHEREUM,
            contractId,
            contactCreatorAddress,
            contactName,
            contactEipVersion
        );

        const contractInstance = await tokenCollectionModel.findOne({ contractId });
        expect(contractInstance).toBeDefined();
        expect(contractInstance.contractId).toBe(contractId);
        expect(contractInstance.name).toBe(contactName);

        const contractCreatorInstance = await userModel.findOne({ _id: contractInstance.userId });
        expect(contractCreatorInstance).toBeDefined();
        expect(contractCreatorInstance.ethAddress).toBe(contactCreatorAddress);

        const tokens = await cardModel.find({ tokenCollectionId: contractInstance.id });
        expect(tokens).toBeDefined();
        expect(tokens.length).toBe(EIP_TOKENS.length);

        const tokenEip = EIP_TOKENS[0];
        const tokenInstance = tokens.find(token => token.tokenId === tokenEip.token);
        expect(tokenInstance).toBeDefined();
        expect(tokenInstance.totalSupply).toBe(parseInt(tokenEip.totalSupply));
        expect(tokenInstance.identifier).toBe(parseInt(tokenEip.identifier));
        expect(tokenInstance.name).toBe(tokenEip.metadata.name);
        expect(tokenInstance.description).toBe(tokenEip.metadata.description);
        expect(tokenInstance.file.original).toBeDefined();
        expect(tokenInstance.balances.length).toBe(EIP_TOKEN_BALANCES.length);

        for (const balance of tokenInstance.balances) {
            const balanceEip = EIP_TOKEN_BALANCES.find(eipBalance => eipBalance.id === balance.balanceId);
            expect(balanceEip).toBeDefined();
            expect(balance).toBeDefined();
            expect(balance.tokenAmount).toBe(parseInt(balanceEip.value));
            const owner = await userModel.findOne({ _id: balance.userId });
            expect(owner).toBeDefined();
            expect(owner.ethAddress).toBe(balanceEip.account.id);
        }
    });

    it('[syncContract] should throw EIP_CONTRACT_FETCH_EMPTY_DATA', async () => {
        jest
            .spyOn(subgraphService, 'getTokenWithMetadataListFetch')
            .mockReturnValue(Promise.resolve([]));

        await expect(
            tokenCollectionsService.syncContract(
                Network.ETHEREUM,
                contractId,
                contactCreatorAddress,
                contactName,
                contactEipVersion
            )
        )
            .rejects
            .toThrow(Errors.EIP_CONTRACT_FETCH_EMPTY_DATA);
    });

    it('[syncContract] should sync contract and tokens', async () => {
        mockEipSuccessResponse();
        await tokenCollectionsService.syncContract(
            Network.ETHEREUM,
            contractId,
            contactCreatorAddress,
            contactName,
            contactEipVersion
        );

        let contractInstance = await tokenCollectionModel.findOne({ contractId });
        expect(contractInstance).toBeDefined();

        let tokens = await cardModel.find({ tokenCollectionId: contractInstance.id });
        expect(tokens).toBeDefined();
        expect(tokens.length).toBe(EIP_TOKENS.length);

        await contractInstance.populate('userId').execPopulate();
        const unusedToken = randomCard(
            contractInstance.user as IUser,
            { _id: contractInstance._id },
            null,
            false
        );
        const unusedTokenInstance = await cardModel.create(unusedToken);
        expect(unusedTokenInstance).toBeDefined();

        tokens = await cardModel.find({ tokenCollectionId: contractInstance.id });
        expect(tokens).toBeDefined();
        expect(tokens.length).toBeGreaterThan(EIP_TOKENS.length);

        await tokenCollectionsService.syncContract(
            Network.ETHEREUM,
            contractId,
            contactCreatorAddress,
            contactName,
            contactEipVersion
        );

        contractInstance = await tokenCollectionModel.findOne({ contractId });
        expect(contractInstance).toBeDefined();

        tokens = await cardModel.find({ tokenCollectionId: contractInstance.id });
        expect(tokens).toBeDefined();
        expect(tokens.length).toBe(EIP_TOKENS.length);
    });

    it('[createCollection] should create collection', async () => {
        const data = await tokenCollectionModel.find();
        expect(data).toBeDefined();
        expect(data.length).toBe(0);

        await tokenCollectionsService.createCollection(
            Network.MATIC,
            contractId,
            new ObjectID().toString(),
            'test'
        );

        const checkData = await tokenCollectionModel.find();
        expect(checkData).toBeDefined();
        expect(checkData.length).toBe(1);
        expect(checkData[0].contractId).toBe(contractId);
    });

    it('[createCollection] should doesnt throw exception if slug duplicate and return null', async () => {
        await tokenCollectionModel.syncIndexes();
        const checkSlug = 'test-slug';
        const user = { _id: new ObjectID() } as any;
        const collection = randomCollection(
            user,
            { _id: new ObjectID().toString() } as any,
            checkSlug
        );

        await tokenCollectionModel.create(collection);

        const data = await tokenCollectionModel.find();
        expect(data).toBeDefined();
        expect(data.length).toBe(1);
        expect(data[0].slug).toBe(checkSlug);

        const { uri } = await prepareMetadata(
            dbConnection,
            user,
            null,
            checkSlug
        );

        const checkContractMetadata = await contractMetadataModel.find();
        expect(checkContractMetadata).toBeDefined();
        expect(checkContractMetadata.length).toBe(1);
        expect(checkContractMetadata[0].slug).toBe(data[0].slug);

        const createdCollection = await tokenCollectionsService.createCollection(
            Network.MATIC,
            contractId,
            new ObjectID().toString(),
            'test',
            uri
        );
        expect(createdCollection).toBeNull();
    });
});