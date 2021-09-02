import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DaoModule } from '../dao/dao.module';
import categoryDaoOptions from './dao/options/category.dao.options';

@Module({
    imports: [DaoModule.forFeature(categoryDaoOptions)],
    providers: [CategoriesService],
    controllers: [CategoriesController],
    exports: [CategoriesService]
})
export class CategoriesModule {}
