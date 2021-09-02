import { ApiProperty } from '@nestjs/swagger';
import { FollowType } from '../../types/enums';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class FollowTypeParamDto {
    @ApiProperty({ required: true, enum: Object.values(FollowType) })
    @IsString()
    @IsNotEmpty()
    @IsEnum(FollowType)
    type: FollowType;
}
