import { IsNotEmpty, IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StoreFrontAddCardsDto {
    @ApiProperty({ type: [String] })
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    @ArrayNotEmpty()
    cards: string[];
}