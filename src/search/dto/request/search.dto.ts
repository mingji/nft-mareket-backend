import {
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    name: string;
}
