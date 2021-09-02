import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    IUser,
    prepareDb,
    prepareJobs,
    prepareMetadata,
    shutdownTest
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JobType } from '../../src/jobs/types/enums';
import { blockchainConfig } from '../../src/config';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { EIP, Network } from '../../src/config/types/constants';
import { ITokenCollectionDocument } from '../../src/tokenCollections/schemas/token-collection.schema';
import { DaoModelNames } from '../../src/types/constants';
import { JobsService } from '../../src/jobs/jobs.service';
import { CardsModule } from '../../src/cards/cards.module';
import { ITokenMetadataLeanDocument } from '../../src/metadata/schemas/token-metadata.schema';
import { CardsService } from '../../src/cards/cards.service';
import { ICardDocument } from '../../src/cards/schemas/cards.schema';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { ITokensData } from '../../src/subgraph/types/scheme';

describe('createdTokensListener-lambda', () => {
    let subgraphService: SubgraphService;
    let cardsService: CardsService;
    let jobsService: JobsService;
    let app: TestingModule;
    let dbConnection: Connection;
    let startBlockNumber: number;
    let tokensMetadata: ITokenMetadataLeanDocument[];
    let contractUri: string;
    let tokensData: ITokensData;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let cardModel: Model<ICardDocument>;
    let userModel: Model<IUserDocument>;

    const contractAddress = 'contractAddress'.toLowerCase();
    const network = Network.MATIC;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CardsModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        cardModel = app.get(getModelToken(DaoModelNames.card));
        userModel = app.get(getModelToken(DaoModelNames.user));
        jobsService = app.get(JobsService);
        subgraphService = app.get(SubgraphService);
        cardsService = app.get(CardsService);
        startBlockNumber = blockchainConfig()[Network.MATIC].startBlock[JobType.createdTokenListener];
    });

    beforeEach(async () => {
        await prepareJobs(
            Network.MATIC,
            dbConnection,
            {
                type: JobType.createdTokenListener,
                processingBlockNumber: startBlockNumber
            }
        );
        const { user } = await prepareDb(app, dbConnection);
        const data = await prepareMetadata(dbConnection, user, contractAddress);
        tokensMetadata = data.tokensMetadata;
        contractUri = data.uri;

        tokensData = {
            [contractAddress]: [
                {
                    contract: contractAddress,
                    identifier: 3,
                    value: 30,
                    uri: `${contractUri}/3`,
                    creator: { id: user.ethAddress },
                },
                {
                    contract: contractAddress,
                    identifier: 5,
                    value: 50,
                    uri: `${contractUri}/5`,
                    creator: { id: user.ethAddress },
                },
            ]
        };

        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(startBlockNumber + 1);

        jest.spyOn(subgraphService, 'getCreatedTokens')
            .mockResolvedValue(tokensData);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('[tokenListener] should create tokens in db', async () => {
        const tokenCollection = await tokenCollectionModel.findOne({ contractId: contractAddress });
        expect(tokenCollection).toBeDefined();
        expect(tokenCollection.id).toBeDefined();

        const cards = await cardModel.find({ tokenCollectionId: tokenCollection.id });
        expect(cards.length).toEqual(0);

        await cardsService.processCreatedTokens(network);

        const processCards = await cardModel.find({ tokenCollectionId: tokenCollection.id });
        expect(processCards.length).toEqual(tokensData[tokenCollection.contractId].length);

        tokensData[tokenCollection.contractId].forEach(subgraphToken => {
            const tokenMetadata = tokensMetadata.find(t => {
                return t.contractAddress === tokenCollection.contractId &&
                    t.token_identifier === subgraphToken.identifier;
            });
            expect(tokenMetadata).toBeDefined();
            const card = processCards.find(c => {
                return c.tokenCollectionId.toString() === tokenCollection.id &&
                    c.identifier === tokenMetadata.token_identifier;
            });
            const tokenId = `${tokenCollection.contractId}-0x${tokenMetadata.token_identifier}`;
            expect(card).toBeDefined();
            expect(card.id).toBeDefined();
            expect(card.id.length).toBeGreaterThan(0);
            expect(card.tokenId).toBeDefined();
            expect(card.tokenId).toBe(tokenId);
            expect(card.eipVersion).toBeDefined();
            expect(Object.values(EIP).includes(card.eipVersion)).toBeTruthy();
            expect(card.identifier).toBeDefined();
            expect(card.identifier).toBe(tokenMetadata.token_identifier);
            expect(card.uri).toBeDefined();
            expect(card.uri).toBe(`${contractUri}/${tokenMetadata.token_identifier}`);
            expect(card.totalSupply).toBeDefined();
            expect(card.totalSupply).toBe(subgraphToken.value);
            expect(card.creator).toBeDefined();
            expect(card.creator.toString()).toBe(tokenMetadata.userId.toString());
            expect(card.balances).toBeDefined();
            expect(card.balances.length).toBe(1);
            expect(card.balances[0]).toBeDefined();
            expect(card.balances[1]).toBeUndefined();
            expect(card.balances[0].balanceId).toBeDefined();
            expect(card.balances[0].balanceId).toBe(`${tokenId}-${subgraphToken.creator.id}`);
            expect(card.balances[0].tokenAmount).toBeDefined();
            expect(card.balances[0].tokenAmount).toBe(subgraphToken.value);
            expect(card.balances[0].userId).toBeDefined();
            expect(card.balances[0].userId.toString()).toBe(tokenMetadata.userId.toString());
            expect(card.balances[0].ethAddress).toBeDefined();
            expect(card.balances[0].ethAddress).toBe(subgraphToken.creator.id);
            expect(card.hasSale).toBeDefined();
            expect(card.hasSale).toBeFalsy();
            expect(card.tokenCollectionId).toBeDefined();
            expect(card.tokenCollectionId.toString()).toBe(tokenCollection.id);
            expect(card.name).toBeDefined();
            expect(card.name).toBe(tokenMetadata.name);
            expect(card.file).toBeDefined();
            expect(card.file.original).toBeDefined();
            expect(card.file.original.location).toBe(tokenMetadata.animation.location);
            expect(card.file.preview).toBeDefined();
            expect(card.file.preview.location).toBe(tokenMetadata.image.location);
            expect(card.description).toBeDefined();
            expect(card.description).toBe(tokenMetadata.description);
            expect(card.properties).toBeDefined();
            expect(card.properties.length).toBe(tokenMetadata.attributes.length);
            card.properties.forEach(prop => {
                expect(prop.property).toBeDefined();
                const metaProp = tokenMetadata.attributes.find(a => a.trait_type === prop.property);
                expect(prop.property).toBe(metaProp.trait_type);
                expect(prop.value).toBe(metaProp.value);
            });
        });
    });

    it('[tokenListener] should also store all valid contracts from subgraph', async () => {
        const otherContractAddress = 'otherContractAddress';
        const newUser = await userModel.create({ ethAddress: 'test' });
        const data = await prepareMetadata(
            dbConnection,
            newUser as IUser,
            otherContractAddress,
            'otherContractSlug'
        );
        const otherContractUri = data.uri;
        tokensData[otherContractAddress] = [
            {
                contract: otherContractAddress,
                identifier: 1,
                value: 10,
                uri: `${otherContractUri}/1`,
                creator: { id: newUser.ethAddress },
            }
        ];

        const wrongContractAddress = 'wrongContractAddress';
        tokensData[wrongContractAddress] = [
            {
                contract: wrongContractAddress,
                identifier: 1,
                value: 10,
                uri: `${otherContractUri}/1`,
                creator: { id: newUser.ethAddress },
            }
        ];

        jest.spyOn(subgraphService, 'getCreatedTokens').mockResolvedValue(tokensData);

        const tokenCollections = await tokenCollectionModel.find({
            contractId: { $in: [contractAddress, otherContractAddress, wrongContractAddress] }
        });
        expect(tokenCollections).toBeDefined();

        const correctCollection1 = tokenCollections.find(t => t.contractId === contractAddress);
        const correctCollection2 = tokenCollections.find(t => t.contractId === otherContractAddress);
        const wrongCollection = tokenCollections.find(t => t.contractId === wrongContractAddress);

        expect(correctCollection1).toBeDefined();
        expect(correctCollection2).toBeDefined();
        expect(wrongCollection).toBeUndefined();

        const cards = await cardModel.find();
        expect(cards.length).toEqual(0);

        await cardsService.processCreatedTokens(network);

        let processCards: ICardDocument[];

        processCards = await cardModel.find({ tokenCollectionId: correctCollection1.id });
        expect(processCards.length).toEqual(tokensData[correctCollection1.contractId].length);

        processCards = await cardModel.find({ tokenCollectionId: correctCollection2.id });
        expect(processCards.length).toEqual(tokensData[correctCollection2.contractId].length);

        processCards = await cardModel.find();
        expect(processCards.length).toEqual(
            tokensData[correctCollection1.contractId].length + tokensData[correctCollection2.contractId].length
        );
        processCards.forEach(card => {
            expect([correctCollection1.id, correctCollection2.id].includes(card.tokenCollectionId.toString()))
                .toBeTruthy()
        });
    });

    it('[tokenListener] should nothing doing when wrong uri host', async () => {
        tokensData[contractAddress].forEach(meta => {
            meta.uri = new URL(new URL(meta.uri).pathname, 'https://test').href;
        });

        jest.spyOn(subgraphService, 'getCreatedTokens').mockResolvedValue(tokensData);

        const tokenCollection = await tokenCollectionModel.findOne({ contractId: contractAddress });
        expect(tokenCollection).toBeDefined();
        expect(tokenCollection.id).toBeDefined();

        const cards = await cardModel.find({ tokenCollectionId: tokenCollection.id });
        expect(cards.length).toEqual(0);

        await cardsService.processCreatedTokens(network);

        const processCards = await cardModel.find({ tokenCollectionId: tokenCollection.id });
        expect(processCards.length).toEqual(0);
    });

    it('[tokenListener] should increase block number after success processing block', async () => {
        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processCreatedTokens(network);

        const checkJob = await jobsService.getJobByType(Network.MATIC, JobType.createdTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });

    it('[tokenListener] should start from increased block number if prev run is ok', async () => {
        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        jest.spyOn(cardsService, 'createTokensByContract').mockResolvedValue(null);
        jest.spyOn(subgraphService, 'getCreatedTokens');
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(job.processingBlockNumber + 10);

        await cardsService.processCreatedTokens(network);
        expect(subgraphService.getCreatedTokens).toHaveBeenCalledWith(network, job.processingBlockNumber);

        await cardsService.processCreatedTokens(network);
        expect(subgraphService.getCreatedTokens).toHaveBeenCalledWith(network, job.processingBlockNumber + 1);
    });

    it('[tokenListener] should only increase job processing block number if tokens empty', async () => {
        jest.spyOn(subgraphService, 'getCreatedTokens').mockResolvedValue({});
        jest.spyOn(cardsService, 'createTokensByContract');

        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processCreatedTokens(network);

        const checkJob = await jobsService.getJobByType(Network.MATIC, JobType.createdTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(cardsService.createTokensByContract).toHaveBeenCalledTimes(0);
    });

    it('[tokenListener] should nothing do if processing block number null', async () => {
        jest.spyOn(jobsService, 'getProcessingBlockNumberByType').mockResolvedValue(null);
        jest.spyOn(cardsService, 'createTokensByContract');

        await cardsService.processCreatedTokens(network);
        expect(cardsService.createTokensByContract).toHaveBeenCalledTimes(0);
    });
});
