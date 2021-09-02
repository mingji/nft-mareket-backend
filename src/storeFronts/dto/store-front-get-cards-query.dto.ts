import {
    IsArray,
    IsOptional,
    IsString,
    IsIn,
    IsInt,
    IsMongoId,
    IsBoolean,
    Max
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SortOrder } from '../../types/constants';
import { CardSortField } from '../../cards/dao/card.dao';
import { Type } from 'class-transformer';
import { StoreFrontCardStatus } from '../types/enums';
import { ToBoolean } from '../../decorators/to-boolean.decorator';
import { Pagination } from '../../config/types/constants';

export class StoreFrontGetCardsQueryDto {
    @ApiProperty({ required: false, enum: Object.values(SortOrder) })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(SortOrder))
    sortOrder?: SortOrder;

    @ApiProperty({ required: false, enum: Object.values(CardSortField) })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(CardSortField))
    sortField?: CardSortField;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Max(Pagination.MAX_ITEMS_PER_PAGE)
    limit?: number = Pagination.ITEMS_PER_PAGE;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    offset?: number = 0;

    @ApiProperty({ required: false, description: 'Array if collectionIds' })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    collections?: string[];

    @ApiProperty({ required: false, description: 'Array if cardIds' })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    cards?: string[];

    @ApiProperty({ enum: Object.values(StoreFrontCardStatus) })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(StoreFrontCardStatus))
    status?: StoreFrontCardStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    sale?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    release?: boolean;
}
