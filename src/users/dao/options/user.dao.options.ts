import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { UserSchema } from '../../schemas/user.schema';
import { UserDao } from '../user.dao';
import { UserMongooseDao } from '../mongoose/user.mongoose.dao';

const userDaoProvider = {
    provide: UserDao,
    useClass: UserMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.user, schema: UserSchema }])],
    providers: [userDaoProvider],
    exports: [userDaoProvider]
};
