import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { CryptocurrencySchema } from '../../schemas/cryptocurrency.schema';
import { CryptocurrencyMongooseDao } from '../mongoose/cryptocurrency.mongoose.dao';
import { CryptocurrencyDao } from '../cryptocurrency.dao';

const cryptoCurrencyDaoProvider = {
    provide: CryptocurrencyDao,
    useClass: CryptocurrencyMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.cryptocurrency, schema: CryptocurrencySchema }])],
    providers: [cryptoCurrencyDaoProvider],
    exports: [cryptoCurrencyDaoProvider]
};
