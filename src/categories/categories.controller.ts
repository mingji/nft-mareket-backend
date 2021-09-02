import { ClassSerializerInterceptor, Controller, Get, Query, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags, ApiExtraModels } from '@nestjs/swagger';
import { CategoryDto } from './dto/category.dto';
import { ICategoryLeanDocument } from './schemas/categories.schema';
import { ArrayResponseDto } from '../dto/array-response.dto';
import { PaginatedRequestDto } from '../dto/paginated-request.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';

@ApiTags('Categories')
@ApiExtraModels(PaginatedResponseDto, CategoryDto)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @ApiPaginatedResponse(CategoryDto)
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('')
    async getAllCategories(
        @Query() query: PaginatedRequestDto
    ): Promise<ArrayResponseDto<CategoryDto, ICategoryLeanDocument>> {
        const categories = await this.categoriesService.getCategories(true, query);

        return new PaginatedResponseDto<CategoryDto, ICategoryLeanDocument>(categories, CategoryDto);
    }
}
