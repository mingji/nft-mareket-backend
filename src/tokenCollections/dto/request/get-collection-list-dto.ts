import { IsIn, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SortOrder } from '../../../types/constants';
import { PaginatedRequestDto } from '../../../dto/paginated-request.dto';

export class GetCollectionListDto extends PaginatedRequestDto {
    @ApiProperty({
        required: false
    })
    @IsOptional()
    @IsArray()
    categories?: Array<string>;
    
    @ApiProperty({
        required: false,
        enum: Object.values(SortOrder)
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(SortOrder))
    createdAtOrder: SortOrder;
    
    @ApiProperty({
        required: false,
        enum: Object.values(SortOrder)
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(SortOrder))
    popularityOrder: SortOrder;
    
    @ApiProperty({
        required: false
    })
    @IsOptional()
    @IsString()
    name: string;
}
