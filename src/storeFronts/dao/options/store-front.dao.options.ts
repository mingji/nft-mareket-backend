import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { StoreFrontDao } from '../store-front.dao';
import { StoreFrontMongooseDao } from '../mongoose/store-front.mongoose.dao';
import { StoreFrontSchema } from '../../schemas/store-fronts.schema';


const storeFrontDaoProvider = {
    provide: StoreFrontDao,
    useClass: StoreFrontMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.storeFront, schema: StoreFrontSchema }])],
    providers: [storeFrontDaoProvider],
    exports: [storeFrontDaoProvider]
};
