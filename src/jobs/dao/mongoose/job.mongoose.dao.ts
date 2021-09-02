import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { JobDao } from '../job.dao';
import { IJobDocument, IJobLeanDocument, IJobQuery } from '../../schemas/jobs.schema';
import { JobType } from '../../types/enums';
import { Network } from '../../../config/types/constants';

@Injectable()
export class JobMongooseDao extends DaoMongoose implements JobDao {
    @InjectModel(DaoModelNames.job) private readonly jobModel: Model<IJobDocument>;

    protected get model(): Model<IJobDocument> {
        return this.jobModel;
    }

    async getJobByType(
        network: Network,
        type: JobType,
        contractAddress?: string,
        lean = false
    ): Promise<IJobLeanDocument | IJobDocument | null> {
        const query = this.jobModel.findOne({
            network,
            type,
            ...( contractAddress ? { contractAddress: contractAddress.toLowerCase() } : null )
        }) as IJobQuery<IJobDocument | null>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }

    async createJob(
        network: Network,
        type: JobType,
        contractAddress?: string,
        processingBlockNumber?: number,
        processingBlockTime?: Date
    ): Promise<IJobDocument> {
        return this.jobModel.create({
            network,
            type,
            processingBlockNumber,
            processingBlockTime,
            contractAddress: contractAddress?.toLowerCase(),
        });
    }

    async increaseJobBlockNumber(
        network: Network,
        type: JobType,
        contractAddress?: string
    ): Promise<void> {
        await this.jobModel.updateOne(
            {
                network,
                type,
                ...( contractAddress ? { contractAddress: contractAddress.toLowerCase() } : null )
            },
            {
                $inc: { processingBlockNumber: 1 },
                $set: { processingBlockTime: new Date() }
            }
        );
    }
}
