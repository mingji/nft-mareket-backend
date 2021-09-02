import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BlockSettingsType, BlockTextsType } from './shared.dto';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';

export class PageBlockAboutSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockTextsType)
    texts: BlockTextsType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockSettingsType)
    settings: BlockSettingsType

    metadata = () => ({
        texts: new BlockTextsType().metadata(),
        settings: new BlockSettingsType().metadata(),
    })
}
