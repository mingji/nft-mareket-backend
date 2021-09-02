import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { NonceSchema } from '../../schemas/nonce.schema';
import { NonceDao } from '../nonce.dao';
import { NonceMongooseDao } from '../mongoose/nonce.mongoose.dao';

const nonceDaoProvider = {
    provide: NonceDao,
    useClass: NonceMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.nonce, schema: NonceSchema }])],
    providers: [nonceDaoProvider],
    exports: [nonceDaoProvider]
};
