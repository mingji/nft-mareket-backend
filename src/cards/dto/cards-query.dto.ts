import {
    IsArray,
    IsBoolean,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateIf
} from 'class-validator';
import { SortOrder } from '../../types/constants';
import { ApiProperty } from '@nestjs/swagger';
import { ToBoolean } from '../../decorators/to-boolean.decorator';
import { CardSortField } from '../dao/card.dao';
import { PaginatedRequestDto } from '../../dto/paginated-request.dto';

export class CardsQueryDto extends PaginatedRequestDto {
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

    @ApiProperty({ required: false, description: 'Array if collectionIds' })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    collections?: string[];

    @ApiProperty({ required: false, description: 'Required with "propertyValue"' })
    @ValidateIf(o => o.propertyValue?.length > 0)
    @IsNotEmpty()
    @IsString()
    propertyName?: string;

    @ApiProperty({ required: false, description: 'Required with "propertyName"' })
    @ValidateIf(o => o.propertyName?.length > 0)
    @IsNotEmpty()
    @IsString()
    propertyValue?: string;

    @ApiProperty({ required: false, description: 'Array if categoryIds' })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    categories?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    sale?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsMongoId()
    userId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsMongoId()
    createdBy?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    search?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsMongoId()
    likedBy?: string;
}
