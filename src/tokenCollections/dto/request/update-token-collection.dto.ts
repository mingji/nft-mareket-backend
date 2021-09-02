import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StoreLinksDto } from '../../../dto/store-links.dto';
import { ToObject } from '../../../decorators/to-object.decorator';

export class UpdateTokenCollectionDto {
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
