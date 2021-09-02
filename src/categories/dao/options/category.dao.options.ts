import { MongooseModule } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { CategoryDao } from '../category.dao';
import { CategoryMongooseDao } from '../mongoose/category.mongoose.dao';
import { CategorySchema } from '../../schemas/categories.schema';

const categoryDaoProvider = {
    provide: CategoryDao,
    useClass: CategoryMongooseDao
};

export default {
    imports: [MongooseModule.forFeature([{ name: DaoModelNames.category, schema: CategorySchema }])],
    providers: [categoryDaoProvider],
    exports: [categoryDaoProvider]
};
