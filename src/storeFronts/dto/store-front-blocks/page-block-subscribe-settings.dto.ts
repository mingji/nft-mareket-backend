import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BlockLinksType, BlockSettingsType, BlockTextsType } from './shared.dto';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';

export class PageBlockSubscribeSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockTextsType)
    texts: BlockTextsType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockLinksType)
    links: BlockLinksType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockSettingsType)
    settings: BlockSettingsType

    metadata = () => ({
        texts: new BlockTextsType().metadata(),
        links: new BlockLinksType().metadata(),
        settings: new BlockSettingsType().metadata(),
    })
}
