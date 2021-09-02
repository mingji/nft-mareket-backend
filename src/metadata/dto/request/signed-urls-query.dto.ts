import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MetadataType } from '../../types/enums';

export class SignedUrlsQueryDto {
    @ApiProperty({ enum: Object.values(MetadataType) })
    @IsNotEmpty()
    @IsString()
    @IsEnum(MetadataType)
    type: MetadataType;
}
