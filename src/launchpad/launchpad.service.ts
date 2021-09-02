import { Injectable } from '@nestjs/common';
import { JobType } from '../jobs/types/enums';
import { JobsService } from '../jobs/jobs.service';
import { SubgraphService } from '../subgraph/subgraph.service';
import { Network } from '../config/types/constants';

@Injectable()
export class LaunchpadService {
    constructor(
        private readonly jobsService: JobsService,
        private readonly subgraphService: SubgraphService,
    ) {}

    async processSell(network: Network): Promise<void> {
        const jobType = JobType.launchpadSaleListener;
        const processingBlockNumber = await this.jobsService.getProcessingBlockNumberByType(network, jobType);
        if (!processingBlockNumber) {
            return;
        }

        //TODO: need implement retrieve data
        const data = await this.subgraphService.getLaunchpadSaleData(network, processingBlockNumber);
        if (!data.length) {
            await this.jobsService.increaseJobBlockNumber(network, jobType);
            return;
        }

        //TODO: implement listener
        await this.jobsService.increaseJobBlockNumber(network, jobType);
    }
}
