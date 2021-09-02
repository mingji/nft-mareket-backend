import { Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import jobDaoOptions from './dao/options/job.dao.options';
import { JobsService } from './jobs.service';
import { ConfigModule } from '@nestjs/config';
import { SubgraphModule } from '../subgraph/subgraph.module';

@Module({
    imports: [DaoModule.forFeature(jobDaoOptions), ConfigModule, SubgraphModule],
    providers: [JobsService],
    exports: [JobsService]
})
export class JobsModule {}
