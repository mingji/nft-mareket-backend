import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { CardDao } from '../card.dao';
import { CardMongooseDao } from '../mongoose/card.mongoose.dao';
import { CardSchema } from '../../schemas/cards.schema';

const cardDaoProvider = {
    provide: CardDao,
    useClass: CardMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.card, schema: CardSchema }])],
    providers: [cardDaoProvider],
    exports: [cardDaoProvider]
};
