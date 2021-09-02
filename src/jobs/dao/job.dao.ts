import { Dao } from '../../dao/dao';
import { IJobDocument, IJobLeanDocument } from '../schemas/jobs.schema';
import { JobType } from '../types/enums';
import { Network } from '../../config/types/constants';

export abstract class JobDao extends Dao {
    public abstract getJobByType(
        network: Network,
        type: JobType,
        contractAddress?: string,
        lean?: boolean
    ): Promise<IJobLeanDocument | IJobDocument | null>;

    public abstract createJob(
        network: Network,
        type: JobType,
        contractAddress?: string,
        processingBlockNumber?: number,
        processingBlockTime?: Date
    ): Promise<IJobDocument>;

    public abstract increaseJobBlockNumber(
        network: Network,
        type: JobType,
        contractAddress: string
    ): Promise<void>;
}
