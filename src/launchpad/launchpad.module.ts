import { Module } from '@nestjs/common';
import { LaunchpadService } from './launchpad.service';
import { SubgraphModule } from '../subgraph/subgraph.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
    imports: [
        SubgraphModule,
        JobsModule,
    ],
    providers: [LaunchpadService],
    exports: [LaunchpadService]
})
export class LaunchpadModule {}
