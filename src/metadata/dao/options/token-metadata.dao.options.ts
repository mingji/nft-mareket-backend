import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { TokenMetadataDao } from '../token-metadata.dao';
import { TokenMetadataMongooseDao } from '../mongoose/token-metadata.mongoose.dao';
import { TokenMetadataSchema } from '../../schemas/token-metadata.schema';

const tokenMetadataDaoProvider = {
    provide: TokenMetadataDao,
    useClass: TokenMetadataMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.tokenMetadata, schema: TokenMetadataSchema }])],
    providers: [tokenMetadataDaoProvider],
    exports: [tokenMetadataDaoProvider]
};
