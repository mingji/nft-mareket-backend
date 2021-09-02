import { StoreFrontPage } from '../types/enums';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StoreFrontPageParamDto {
    @ApiProperty({ required: true, enum: Object.values(StoreFrontPage) })
    @IsEnum(StoreFrontPage)
    page: StoreFrontPage;
}
