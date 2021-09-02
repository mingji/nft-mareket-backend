import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { UserSessionSchema } from '../../schemas/user-session.schema';
import { UserSessionDao } from '../user-session.dao';
import { UserSessionMongooseDao } from '../mongoose/user-session.mongoose.dao';

const userSessionDaoProvider = {
    provide: UserSessionDao,
    useClass: UserSessionMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.userSession, schema: UserSessionSchema }])],
    providers: [userSessionDaoProvider],
    exports: [userSessionDaoProvider]
};
