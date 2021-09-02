import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { CardViewerDao } from '../card-viewer.dao';
import { CardViewerMongooseDao } from '../mongoose/card-viewer.mongoose.dao';
import { CardViewerSchema } from '../../schemas/card-viewers.schema';

const cardViewerDaoProvider = {
    provide: CardViewerDao,
    useClass: CardViewerMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.cardViewer, schema: CardViewerSchema }])],
    providers: [cardViewerDaoProvider],
    exports: [cardViewerDaoProvider]
};
