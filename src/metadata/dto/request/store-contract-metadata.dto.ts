import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StoreLinksDto } from '../../../dto/store-links.dto';
import { ToObject } from '../../../decorators/to-object.decorator';
import { IsSlug } from '../../../decorators/validations/is-slug';

export class StoreContractMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsSlug()
    slug: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    symbol?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    description?: string;

    @ApiProperty({ type: StoreLinksDto })
    @IsOptional()
    @IsNotEmpty()
    @ToObject(StoreLinksDto)
    links?: StoreLinksDto;
}
