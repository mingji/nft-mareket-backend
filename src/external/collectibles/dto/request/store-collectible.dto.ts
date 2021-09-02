import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BasicStoreTokenMetadataDto } from '../../../../metadata/dto/request/basic-store-token-metadata.dto';

export class StoreCollectibleDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    externalCollectibleId: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsOptional()
    @IsString()
    externalStoreId?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    externalCreatorId: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    externalCreatorEmail: string;

    @ApiProperty()
    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    maxSupply: number;

    @ApiProperty({ type: BasicStoreTokenMetadataDto })
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => BasicStoreTokenMetadataDto)
    metadata: BasicStoreTokenMetadataDto;
}
