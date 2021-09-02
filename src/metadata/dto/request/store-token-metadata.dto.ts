import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsHexColor,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested
} from 'class-validator';
import { ToObject } from '../../../decorators/to-object.decorator';
import { DisplayType } from '../../types/enums';
import { Type } from 'class-transformer';
import { IsValidAttributeValue } from './rules/is-valid-attribute-value';
import { IsValidAttributeMaxValue } from './rules/is-valid-attribute-max-value';
import { NumberDisplayTypes } from '../../types/constants';

export class MetadataAttributeDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    trait_type?: string;

    @ApiProperty()
    @IsNotEmpty()
    @Type((v) => {
        const displayType = v.object.display_type;
        if (!displayType) {
            return String;
        }

        if (displayType === DisplayType.date) {
            return Date;
        }

        if (NumberDisplayTypes.includes(displayType)) {
            return Number;
        }

        return String;
    })
    @IsValidAttributeValue()
    value: any;

    @ApiProperty({ required: false })
    @IsNotEmpty()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsValidAttributeMaxValue()
    max_value?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsEnum(DisplayType)
    display_type?: DisplayType;
}

export class StoreTokenMetadataDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    image_data?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    external_url?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    imageKey: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsOptional()
    @IsString()
    animationKey?: string;

    @ApiProperty({ required: false, description: 'JSON string like MetadataAttributeDto' })
    @ToObject(MetadataAttributeDto)
    @ValidateNested({ each: true })
    @IsOptional()
    @IsNotEmpty()
    attributes?: MetadataAttributeDto[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsHexColor()
    background_color?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    youtube_url?: string;
}
