import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { TokenCollectionSchema } from '../../schemas/token-collection.schema';
import { TokenCollectionDao } from '../token-collection.dao';
import { TokenCollectionMongooseDao } from '../mongoose/token-collection.mongoose.dao';

const tokenCollectionDaoProvider = {
    provide: TokenCollectionDao,
    useClass: TokenCollectionMongooseDao
};

export default {
    imports: [
        MongooseModule.forFeature([{ name: DaoModelNames.tokenCollection, schema: TokenCollectionSchema }])
    ],
    providers: [tokenCollectionDaoProvider],
    exports: [tokenCollectionDaoProvider]
};
