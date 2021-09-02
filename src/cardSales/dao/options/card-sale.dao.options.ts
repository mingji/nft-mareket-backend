import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { CardSaleSchema } from '../../schemas/card-sales.schema';
import { CardSaleDao } from '../card-sale.dao';
import { CardSaleMongooseDao } from '../mongoose/card-sale.mongoose.dao';

const cardSaleDaoProvider = {
    provide: CardSaleDao,
    useClass: CardSaleMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.cardSale, schema: CardSaleSchema }])],
    providers: [cardSaleDaoProvider],
    exports: [cardSaleDaoProvider]
};
