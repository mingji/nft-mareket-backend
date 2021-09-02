import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional,  Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Pagination } from '../config/types/constants';

export class PaginatedRequestDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Max(Pagination.MAX_ITEMS_PER_PAGE)
    limit = Pagination.ITEMS_PER_PAGE;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    offset = 0;
}