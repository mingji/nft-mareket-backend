import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUrl
} from 'class-validator';
import { Type } from 'class-transformer';
import { IBasicTokenMetadataProperties } from '../../types/scheme';

export class BasicStoreTokenMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    decimals?: number;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    description?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    image: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsObject()
    properties?: IBasicTokenMetadataProperties;
}
