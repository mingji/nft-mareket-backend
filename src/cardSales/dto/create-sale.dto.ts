import { ApiProperty } from '@nestjs/swagger';
import {
    IsDate,
    IsHexadecimal,
    IsInt,
    IsNotEmpty,
    IsNumberString,
    IsOptional,
    IsString,
    ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { MinTimestamp } from '../../decorators/validations/min-timestamp';
import { MaxTimestamp } from '../../decorators/validations/max-timestamp';

const minDate = () => new Date(new Date().setHours(0, 0, 0, 0));

class TokenDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsInt()
    tokensCount: number;

    @ApiProperty()
    @IsNotEmpty()
    @IsNumberString()
    price: string;

    @ApiProperty({ required: true })
    @Type(() => Date)
    @IsDate()
    @MinTimestamp({ property: 'publishTo' })
    @MaxTimestamp({ date: minDate })
    publishFrom: Date;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @MaxTimestamp({ property: 'publishFrom', defaultDate: minDate })
    publishTo?: Date;

    @ApiProperty()
    @IsNotEmpty()
    @IsHexadecimal()
    salt: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    staticExtraData: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    currency: string;
}

export class CreateSaleDto {
    @ApiProperty({ type: TokenDto })
    @ValidateNested({ each: true })
    @Type(() => TokenDto)
    data: TokenDto;

    @ApiProperty()
    @IsHexadecimal()
    @IsNotEmpty()
    signature: string;
}