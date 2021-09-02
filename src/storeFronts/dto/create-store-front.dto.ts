import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreFrontDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly name: string;
}