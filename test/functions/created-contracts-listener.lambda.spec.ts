import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    prepareDb,
    prepareJobs,
    prepareMetadata,
    shutdownTest
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JobType } from '../../src/jobs/types/enums';
import { ConfigService } from '@nestjs/config';
import { blockchainConfig, IBlockchainConfig } from '../../src/config';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { TokenCollectionsModule } from '../../src/tokenCollections/token-collections.module';
import { IContractMetadataLeanDocument } from '../../src/metadata/schemas/contract-metadata.schema';
import { TokenCollectionsService } from '../../src/tokenCollections/token-collections.service';
import { Network } from '../../src/config/types/constants';
import { ITokenCollectionDocument } from '../../src/tokenCollections/schemas/token-collection.schema';
import { DaoModelNames } from '../../src/types/constants';
import { ICreatedCollectionData } from '../../src/subgraph/types/scheme';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { JobsService } from '../../src/jobs/jobs.service';
import * as faker from 'faker';

describe('createdContractsListener-lambda', () => {
    let configService: ConfigService;
    let subgraphService: SubgraphService;
    let tokenCollectionsService: TokenCollectionsService;
    let jobsService: JobsService;
    let app: TestingModule;
    let dbConnection: Connection;
    let startBlockNumber: number;
    let contractMetadata: IContractMetadataLeanDocument;
    let contractUri: string;
    let contractsData: ICreatedCollectionData;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let userModel: Model<IUserDocument>;

    const contractAddress = 'contractAddress'.toLowerCase();
    const network = Network.MATIC;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), TokenCollectionsModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        configService = app.get(ConfigService);
        tokenCollectionsService = app.get(TokenCollectionsService);
        jobsService = app.get(JobsService);
        subgraphService = app.get(SubgraphService);
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        userModel = app.get(getModelToken(DaoModelNames.user));
        const blockchainConfig = configService.get<IBlockchainConfig>('blockchain');
        startBlockNumber = blockchainConfig[Network.MATIC].startBlock[JobType.createdContractListener];
    });

    beforeEach(async () => {
        await prepareJobs(
            Network.MATIC,
            dbConnection,
            {
                type: JobType.createdContractListener,
                processingBlockNumber: startBlockNumber
            }
        );
        const { user } = await prepareDb(app, dbConnection);
        const data = await prepareMetadata(dbConnection, user);
        contractMetadata = data.contractMetadata;
        contractUri = data.uri;

        contractsData = {
            [contractAddress]: {
                creator: { id: user.ethAddress },
                collectionAddress: contractAddress,
                name: contractMetadata.name,
                uri: contractUri,
            }
        };

        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(startBlockNumber + 1);

        jest.spyOn(subgraphService, 'getCreatedCollections')
            .mockResolvedValue(contractsData);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('[contractListener] should create collection in db', async () => {
        let collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);

        await tokenCollectionsService.processCreatedContracts(network);

        collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(Object.values(contractsData).length);

        const contract = contractsData[contractAddress];
        const createdCollection = await tokenCollectionModel.findOne({ contractId: contract.collectionAddress });

        expect(createdCollection).toBeDefined();
        expect(createdCollection.name).toBeDefined();
        expect(createdCollection.name).toBe(contract.name);
        expect(createdCollection.uri).toBeDefined();
        expect(createdCollection.uri).toBe(contract.uri);
        expect(createdCollection.symbol).toBeDefined();
        expect(createdCollection.symbol).toBe(contractMetadata.symbol);
        expect(createdCollection.description).toBeDefined();
        expect(createdCollection.description).toBe(contractMetadata.description);
        expect(createdCollection.logo).toBeDefined();
        expect(createdCollection.logo.location).toBeDefined();
        expect(createdCollection.logo.location).toBe(contractMetadata.logo.location);
        expect(createdCollection.links).toBeDefined();
        expect(createdCollection.links.twitter).toBeDefined();
        expect(createdCollection.links.twitter).toBe(contractMetadata.links.twitter);
        expect(createdCollection.slug).toBeDefined();
        expect(createdCollection.slug).toBe(contractMetadata.slug);

        expect(createdCollection.blockchain).toBeDefined();
        expect(createdCollection.blockchain).toBe(network);

        const user = await userModel.findOne({ ethAddress: contract.creator.id });
        expect(user).toBeDefined();
        expect(user.id).toBeDefined();

        expect(createdCollection.userId).toBeDefined();
        expect(createdCollection.userId.toString()).toBe(user.id);
    });

    it('[contractListener] should create collection in db without uri', async () => {
        contractsData[contractAddress].uri = null;
        jest.spyOn(subgraphService, 'getCreatedCollections')
            .mockResolvedValue(contractsData);

        let collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);

        await tokenCollectionsService.processCreatedContracts(network);

        collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(Object.values(contractsData).length);

        const contract = contractsData[contractAddress];
        const createdCollection = await tokenCollectionModel.findOne({ contractId: contract.collectionAddress });

        expect(createdCollection).toBeDefined();
        expect(createdCollection.name).toBeDefined();
        expect(createdCollection.name).toBe(contract.name);
        expect(createdCollection.uri).toBeDefined();
        expect(createdCollection.uri).toBeNull();
        expect(createdCollection.symbol).toBeDefined();
        expect(createdCollection.symbol).toBeNull();
        expect(createdCollection.description).toBeUndefined();
        expect(createdCollection.logo).toBeUndefined();
        expect(createdCollection.links).toBeUndefined();
        expect(createdCollection.slug).toBeUndefined();

        const user = await userModel.findOne({ ethAddress: contract.creator.id });
        expect(user).toBeDefined();
        expect(user.id).toBeDefined();

        expect(createdCollection.userId).toBeDefined();
        expect(createdCollection.userId.toString()).toBe(user.id);
    });

    it('[contractListener] should nothing doing when wrong uri host', async () => {
        contractsData[contractAddress].uri = faker.internet.url();
        jest.spyOn(subgraphService, 'getCreatedCollections')
            .mockResolvedValue(contractsData);

        let collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);

        await tokenCollectionsService.processCreatedContracts(network);

        collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);
    });

    it('[contractListener] should nothing doing when wrong uri path', async () => {
        contractsData[contractAddress].uri = `${blockchainConfig().metadataUriDomain}/test`;
        jest.spyOn(subgraphService, 'getCreatedCollections')
            .mockResolvedValue(contractsData);

        let collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);

        await tokenCollectionsService.processCreatedContracts(network);

        collections = await tokenCollectionModel.find();
        expect(collections.length).toEqual(0);
    });

    it('[contractListener] should increase block number after success processing block', async () => {
        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdContractListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await tokenCollectionsService.processCreatedContracts(network);

        const checkJob = await jobsService.getJobByType(Network.MATIC, JobType.createdContractListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });

    it('[contractListener] should start from increased block number if prev run is ok', async () => {
        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdContractListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        jest.spyOn(tokenCollectionsService, 'createCollection').mockResolvedValue(null);
        jest.spyOn(subgraphService, 'getCreatedCollections');
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(job.processingBlockNumber + 10);

        await tokenCollectionsService.processCreatedContracts(network);
        expect(subgraphService.getCreatedCollections).toHaveBeenCalledWith(network, job.processingBlockNumber);

        await tokenCollectionsService.processCreatedContracts(network);
        expect(subgraphService.getCreatedCollections).toHaveBeenCalledWith(network, job.processingBlockNumber + 1);
    });

    it('[contractListener] should only increase job processing block number if contracts empty', async () => {
        jest.spyOn(subgraphService, 'getCreatedCollections').mockResolvedValue({});
        jest.spyOn(tokenCollectionsService, 'createCollection');

        const job = await jobsService.getJobByType(Network.MATIC, JobType.createdContractListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await tokenCollectionsService.processCreatedContracts(network);

        const checkJob = await jobsService.getJobByType(Network.MATIC, JobType.createdContractListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(tokenCollectionsService.createCollection).toHaveBeenCalledTimes(0);
    });

    it('[contractListener] should nothing do if processing block number null', async () => {
        jest.spyOn(jobsService, 'getProcessingBlockNumberByType').mockResolvedValue(null);
        jest.spyOn(tokenCollectionsService, 'createCollection');

        await tokenCollectionsService.processCreatedContracts(network);
        expect(tokenCollectionsService.createCollection).toHaveBeenCalledTimes(0);
    });
});
