import { Injectable } from '@nestjs/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { JobDao } from './dao/job.dao';
import { IJobDocument, IJobLeanDocument } from './schemas/jobs.schema';
import { JobType } from './types/enums';
import { Errors } from './types/errors';
import { ConfigService } from '@nestjs/config';
import { SubgraphService } from '../subgraph/subgraph.service';
import { JobError } from './errors/job.error';
import { Network } from '../config/types/constants';

@Injectable()
export class JobsService extends MongooseService {
    constructor(
        private readonly jobDao: JobDao,
        private readonly configService: ConfigService,
        private readonly subgraphService: SubgraphService
    ) {
        super();
    }

    protected get dao(): JobDao {
        return this.jobDao;
    }

    async getJobByType(
        network: Network,
        type: JobType,
        contractAddress?: string,
        lean = false
    ): Promise<IJobDocument | IJobLeanDocument | null> {
        return await this.dao.getJobByType(network, type, contractAddress, lean);
    }

    async createJob(
        network: Network,
        type: JobType,
        contractAddress?: string,
        processingBlockNumber?: number,
        processingBlockTime?: Date
    ): Promise<IJobDocument> {
        return this.dao.createJob(network, type, contractAddress, processingBlockNumber, processingBlockTime);
    }

    async getProcessingBlockNumberByType(
        network: Network,
        type: JobType,
        contractAddress?: string
    ): Promise<number | null> {
        const job = await this.getJobByType(network, type, contractAddress, true);
        if (!job) {
            throw new JobError(Errors.JOB_NOT_FOUND);
        }

        const { processingBlockNumber } = job;
        if (!processingBlockNumber) {
            throw new JobError(Errors.BLOCK_NUMBER_DOES_NOT_SET);
        }

        const latestBlockNumber = await this.subgraphService.getLatestBlockNumber(network);
        if (typeof latestBlockNumber !== 'number') {
            throw new JobError(Errors.UNDEFINED_SUBGRAPH_LATEST_BLOCK_NUMBER);
        }

        if (processingBlockNumber > latestBlockNumber) {
            return null;
        }

        return processingBlockNumber;
    }

    async increaseJobBlockNumber(network: Network, type: JobType, contractAddress?: string): Promise<void> {
        await this.dao.increaseJobBlockNumber(network, type, contractAddress);
    }
}
