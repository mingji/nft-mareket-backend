import { PaginatedRequestDto } from '../../../dto/paginated-request.dto';
import { SortOrder } from '../../../types/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';


export class FollowListQueryDto extends PaginatedRequestDto {
    @ApiProperty({ required: false, enum: Object.values(SortOrder) })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(SortOrder))
    sortOrder?: SortOrder;
}
