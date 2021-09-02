import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { FollowSchema } from '../../schemas/follows.schema';
import { FollowDao } from '../follow.dao';
import { FollowMongooseDao } from '../mongoose/follow.mongoose.dao';

const followDaoProvider = {
    provide: FollowDao,
    useClass: FollowMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.follow, schema: FollowSchema }])],
    providers: [followDaoProvider],
    exports: [followDaoProvider]
};
