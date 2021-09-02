import { ICategoryDocument, ICategoryLeanDocument, ICategoryQuery } from '../schemas/categories.schema';
import { Dao } from '../../dao/dao';
import { PaginatedRequestDto } from '../../dto/paginated-request.dto';
import { IPaginatedList } from '../../types/common';

export abstract class CategoryDao extends Dao {
    static readonly LIMIT_COLLECTIONS_PER_CATEGORY: number = 14;

    public abstract findAllCategories(
        lean: boolean,
        withTopCollections: boolean,
        pagination?: PaginatedRequestDto
    ): Promise<Array<ICategoryLeanDocument>> | ICategoryQuery<Array<ICategoryDocument>>;

    public abstract getCategories(
        lean: boolean,
        withTopCollections: boolean,
        pagination: PaginatedRequestDto
    ): Promise<IPaginatedList<ICategoryLeanDocument>>;
}
