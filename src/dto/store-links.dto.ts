import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class StoreLinksDto {
    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    website?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    twitter?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    telegram?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    discord?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    medium?: string;
}