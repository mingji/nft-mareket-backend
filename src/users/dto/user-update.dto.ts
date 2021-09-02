import { ApiProperty } from '@nestjs/swagger';
import { LinksDto } from '../../dto/links.dto';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ToObject } from '../../decorators/to-object.decorator';
import { IsSlug } from '../../decorators/validations/is-slug';

export class UserUpdateDto {
    @ApiProperty()
    @IsOptional()
    @Length(0, 128)
    name?: string;

    @ApiProperty()
    @IsOptional()
    @Length(0, 512)
    description?: string;

    @ApiProperty()
    @IsOptional()
    @IsSlug(true)
    slug?: string;

    @ApiProperty({ type: LinksDto })
    @IsOptional()
    @ToObject()
    @IsNotEmpty()
    links?: LinksDto;
}
