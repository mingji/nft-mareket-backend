import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../../types/constants';
import { CollectibleDao } from '../collectible.dao';
import { CollectibleMongooseDao } from '../mongoose/collectible.mongoose.dao';
import { CollectibleSchema } from '../../schemas/collectible.schema';

const collectibleDaoProvider = {
    provide: CollectibleDao,
    useClass: CollectibleMongooseDao
};

export default {
    imports: [
        MongooseModule.forFeature([{ name: DaoModelNames.externalCollectible, schema: CollectibleSchema }])
    ],
    providers: [collectibleDaoProvider],
    exports: [collectibleDaoProvider]
};
