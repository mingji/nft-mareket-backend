import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsUrl, MinLength, MaxLength } from 'class-validator';

export class ReportMessageDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsString()
    @ApiProperty()
    @MinLength(5)
    @MaxLength(500)
    message: string;

    @IsUrl()
    @IsNotEmpty()
    @ApiProperty()
    link: string;
}
