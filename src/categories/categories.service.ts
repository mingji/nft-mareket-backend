import { Injectable } from "@nestjs/common";
import { CategoryDao } from "./dao/category.dao";
import { ICategoryLeanDocument } from './schemas/categories.schema';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { PaginatedRequestDto } from '../dto/paginated-request.dto';
import { IPaginatedList } from '../types/common';

@Injectable()
export class CategoriesService extends MongooseService {
    constructor (private readonly categoryDao: CategoryDao) {
        super();
    }

    protected get dao(): CategoryDao {
        return this.categoryDao;
    }

    async getAllCategories(withTopCollections = true): Promise<Array<ICategoryLeanDocument>> {
        return this.categoryDao.findAllCategories(true, withTopCollections);
    }

    async getCategories(
        withTopCollections = true,
        pagination?: PaginatedRequestDto
    ): Promise<IPaginatedList<ICategoryLeanDocument>> {
        return this.dao.getCategories(true, withTopCollections, pagination);
    }
}