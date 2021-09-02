import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSlug } from '../../decorators/validations/is-slug';

export class StoreFrontUpdateSettingsDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly name?: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsSlug()
    readonly slug?: string;

    @ApiProperty()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    readonly fee?: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly payoutAddress?: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    readonly paymentTokens?: string[];
}
