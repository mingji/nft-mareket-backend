import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { ContractMetadataSchema } from '../../schemas/contract-metadata.schema';
import { ContractMetadataDao } from '../contract-metadata.dao';
import { ContractMetadataMongooseDao } from '../mongoose/contract-metadata.mongoose.dao';

const contractMetadataDaoProvider = {
    provide: ContractMetadataDao,
    useClass: ContractMetadataMongooseDao
};

export default {
    imports: [
        MongooseModule.forFeature([{ name: DaoModelNames.contractMetadata, schema: ContractMetadataSchema }])
    ],
    providers: [contractMetadataDaoProvider],
    exports: [contractMetadataDaoProvider]
};
