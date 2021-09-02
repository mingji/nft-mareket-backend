import { DaoModelNames } from '../../../types/constants';
import { UserSignatureRequestSchema } from '../../schemas/user-signature-request.schema';
import { UserSignatureRequestDao } from '../user-signature-request.dao';
import { UserSignatureRequestMongooseDao } from '../mongoose/user-signature-request.mongoose.dao';
import { MongooseModule } from '@nestjs/mongoose';

const daoProvider = {
    provide: UserSignatureRequestDao,
    useClass: UserSignatureRequestMongooseDao
};

export default {
    imports: [
        MongooseModule.forFeature([
            { name: DaoModelNames.userSignatureRequest, schema: UserSignatureRequestSchema }
        ])
    ],
    providers: [daoProvider],
    exports: [daoProvider]
};
