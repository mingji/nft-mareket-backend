import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SortOrder } from '../../../types/constants';
import { PaginatedRequestDto } from '../../../dto/paginated-request.dto';
import { ToBoolean } from '../../../decorators/to-boolean.decorator';

export class GetUserCollectionsDto extends PaginatedRequestDto {
    @ApiProperty({
        required: false,
        enum: Object.values(SortOrder)
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(SortOrder))
    sort: SortOrder;

    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    created?: boolean;
}
