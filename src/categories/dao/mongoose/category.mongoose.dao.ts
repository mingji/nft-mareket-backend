import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CategoryDao } from '../category.dao';
import { ICategoryDocument, ICategoryLeanDocument, ICategoryQuery } from '../../schemas/categories.schema';
import { DaoModelNames } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { PaginatedRequestDto } from '../../../dto/paginated-request.dto';
import { IPaginatedList } from '../../../types/common';

@Injectable()
export class CategoryMongooseDao extends DaoMongoose implements CategoryDao {
    @InjectModel(DaoModelNames.category) private readonly categoryModel: Model<ICategoryDocument>;

    protected get model(): Model<ICategoryDocument> {
        return this.categoryModel;
    }

    findAllCategories(
        lean = false,
        withTopCollections = false
    ): Promise<Array<ICategoryLeanDocument>> | ICategoryQuery<Array<ICategoryDocument>> {
        const query = this.categoryModel.find({}) as ICategoryQuery<Array<ICategoryDocument>>;

        if (withTopCollections) {
            query.populate({
                path: 'tokenCollections',
                options: { sort: { popularity: -1 } },
                perDocumentLimit: CategoryDao.LIMIT_COLLECTIONS_PER_CATEGORY
            });
        }

        if (!lean) {
            return query;
        }

        return query.additionalLean();
    }

    async getCategories(
        lean = false,
        withTopCollections = false,
        pagination: PaginatedRequestDto
    ): Promise<IPaginatedList<ICategoryLeanDocument>> {
        const query = this.findAllCategories(lean, withTopCollections) as ICategoryQuery<Array<ICategoryDocument>>;

        const data = await query.skip(pagination.offset).limit(pagination.limit);
        const total = await (this.findAllCategories() as ICategoryQuery<Array<ICategoryDocument>>).countDocuments();

        return { ...pagination, data, total };
    }
}
