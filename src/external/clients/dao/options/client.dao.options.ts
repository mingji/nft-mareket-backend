import { MongooseModule } from '@nestjs/mongoose';
import { ClientSchema } from '../../schemas/client.schema';
import { DaoModelNames } from '../../../../types/constants';
import { ClientDao } from '../client.dao';
import { ClientMongooseDao } from '../mongoose/client.mongoose.dao';

const clientDaoProvider = {
    provide: ClientDao,
    useClass: ClientMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.externalClient, schema: ClientSchema }])],
    providers: [clientDaoProvider],
    exports: [clientDaoProvider]
};
