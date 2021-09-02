import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsSlug } from '../../decorators/validations/is-slug';

export class PublishStoreFrontDto {
    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsSlug()
    readonly slug?: string;
}
