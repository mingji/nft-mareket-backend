import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { JobDao } from '../job.dao';
import { JobMongooseDao } from '../mongoose/job.mongoose.dao';
import { JobSchema } from '../../schemas/jobs.schema';

const jobDaoProvider = {
    provide: JobDao,
    useClass: JobMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.job, schema: JobSchema }])],
    providers: [jobDaoProvider],
    exports: [jobDaoProvider]
};
