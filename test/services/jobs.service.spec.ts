import { Test } from '@nestjs/testing';
import { baseAppModules, baseAppProviders, clearDb, prepareJobs, shutdownTest } from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { JobsService } from '../../src/jobs/jobs.service';
import { JobsModule } from '../../src/jobs/jobs.module';
import { JobType } from '../../src/jobs/types/enums';
import { IJobDocument } from '../../src/jobs/schemas/jobs.schema';
import { IBlockchainConfig } from '../../src/config';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { Errors } from '../../src/jobs/types/errors';
import { ConfigService } from '@nestjs/config';
import { Network } from '../../src/config/types/constants';

describe('JobsService', () => {
    let app: TestingModule;
    let dbConnection: Connection;
    let jobsService: JobsService;
    let subgraphService: SubgraphService;
    let configService: ConfigService;
    let jobsModel: Model<IJobDocument>;
    let saleContract: string;
    let startBlockNumber: number;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), JobsModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        jobsService = app.get(JobsService);
        subgraphService = app.get(SubgraphService);
        jobsModel = app.get(getModelToken(DaoModelNames.job));

        configService = app.get(ConfigService);
        const blockchainConfig = configService.get<IBlockchainConfig>('blockchain');
        saleContract = blockchainConfig[Network.ETHEREUM].saleContract;
        startBlockNumber = blockchainConfig[Network.ETHEREUM].startBlock[JobType.saleListener];
    });

    beforeEach(async () => {
        await prepareJobs(
            Network.ETHEREUM,
            dbConnection,
            {
                type: JobType.saleListener,
                processingBlockNumber: startBlockNumber,
                contractAddress: saleContract
            }
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
        expect(jobsService).toBeDefined();
    });

    it('[getJobByType] should return job instance', async () => {
        const job = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener);
        expect(job).toBeDefined();
        expect(job.type).toBeDefined();
        expect(job.type).toBe(JobType.saleListener);
    });

    it('[createJob] should create job instance', async () => {
        await jobsModel.deleteMany();
        const jobs = await jobsModel.find();
        expect(jobs.length).toBe(0);

        await jobsService.createJob(Network.ETHEREUM, JobType.saleListener);
        const saleListenerJob = await jobsModel.findOne({ type: JobType.saleListener });
        expect(saleListenerJob).toBeDefined();
        expect(saleListenerJob.type).toBeDefined();
        expect(saleListenerJob.type).toBe(JobType.saleListener);
    });

    it('[getProcessingBlockNumberByType] should return processing job block number', async () => {
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(startBlockNumber + 1);

        const processingBlockNumber = await jobsService.getProcessingBlockNumberByType(
            Network.ETHEREUM,
            JobType.saleListener,
            saleContract
        );

        expect(processingBlockNumber).toBeDefined();
        expect(processingBlockNumber).toBeGreaterThan(0);
    });

    it('[getProcessingBlockNumberByType] should throw JOB_NOT_FOUND', async () => {
        jest.spyOn(jobsService, 'getJobByType').mockResolvedValue(null);

        await expect(
            jobsService.getProcessingBlockNumberByType(
                Network.ETHEREUM,
                JobType.saleListener,
                saleContract
            )
        ).rejects.toThrow(Errors.JOB_NOT_FOUND);
    });

    it('[getProcessingBlockNumberByType] should throw BLOCK_NUMBER_DOES_NOT_SET', async () => {
        jest.spyOn(jobsService, 'getJobByType')
            .mockResolvedValue({ processingBlockNumber: null } as IJobDocument);

        await expect(
            jobsService.getProcessingBlockNumberByType(
                Network.ETHEREUM,
                JobType.saleListener,
                saleContract
            )
        ).rejects.toThrow(Errors.BLOCK_NUMBER_DOES_NOT_SET);
    });

    it('[getProcessingBlockNumberByType] should throw UNDEFINED_SUBGRAPH_LATEST_BLOCK_NUMBER', async () => {
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(undefined);

        await expect(
            jobsService.getProcessingBlockNumberByType(
                Network.ETHEREUM,
                JobType.saleListener,
                saleContract
            )
        ).rejects.toThrow(Errors.UNDEFINED_SUBGRAPH_LATEST_BLOCK_NUMBER);
    });

    it(
        '[getProcessingBlockNumberByType] should return null if latest block less than processing',
        async () => {
            const job = await jobsModel.findOne({ type: JobType.saleListener, contractAddress: saleContract });
            expect(job).toBeDefined();
            expect(job.type).toBe(JobType.saleListener);
            expect(job.contractAddress).toBe(saleContract);
            expect(job.processingBlockNumber).toBeDefined();
            expect(job.processingBlockNumber).toBeGreaterThan(0);

            jest.spyOn(subgraphService, 'getLatestBlockNumber')
                .mockResolvedValue(job.processingBlockNumber - 1);

            expect(
                await jobsService.getProcessingBlockNumberByType(
                    Network.ETHEREUM,
                    JobType.saleListener,
                    saleContract
                )
            ).toBeNull();
        }
    );

    it('[increaseJobBlockNumber] should increase job block number', async () => {
        const job = await jobsModel.findOne({ type: JobType.saleListener, contractAddress: saleContract });
        expect(job).toBeDefined();
        expect(job.type).toBe(JobType.saleListener);
        expect(job.contractAddress).toBe(saleContract);
        expect(job.processingBlockNumber).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await jobsService.increaseJobBlockNumber(
            Network.ETHEREUM,
            JobType.saleListener,
            saleContract
        );

        const check = await jobsModel.findOne({ type: JobType.saleListener, contractAddress: saleContract });
        expect(check.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });
});