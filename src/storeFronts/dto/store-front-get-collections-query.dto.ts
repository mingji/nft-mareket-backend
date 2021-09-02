import {
    IsOptional,
    IsString,
    IsIn,
    IsInt,
    IsBoolean,
    Max,
    IsArray,
    IsMongoId
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StoreFrontCardStatus, StoreFrontCollectionStatus } from '../types/enums';
import { ToBoolean } from '../../decorators/to-boolean.decorator';
import { Pagination } from '../../config/types/constants';

export class StoreFrontGetCollectionsQueryDto {
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

    @ApiProperty({ enum: Object.values(StoreFrontCardStatus) })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(StoreFrontCollectionStatus))
    status?: StoreFrontCollectionStatus;

    @ApiProperty({ required: false, description: 'Array if collectionIds' })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    collections?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    release?: boolean;
}
