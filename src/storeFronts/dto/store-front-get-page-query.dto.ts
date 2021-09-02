import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToBoolean } from '../../decorators/to-boolean.decorator';

export class StoreFrontGetPageQueryDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    release?: boolean;
}
