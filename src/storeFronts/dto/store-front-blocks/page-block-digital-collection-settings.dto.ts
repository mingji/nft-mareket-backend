import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BlockCollectiblesSimpleType, BlockSettingsType, BlockTextsType } from './shared.dto';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';
import { EntityIdDto } from '../../../dto/entity-id.dto';
import { ToSettingDto } from '../../decorators/to-setting-dto.decorator';

export class PageBlockDigitalCollectionSettingsDto extends EntityIdDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockTextsType)
    texts: BlockTextsType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(BlockCollectiblesSimpleType)
    collectibles: BlockCollectiblesSimpleType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockSettingsType)
    settings: BlockSettingsType

    metadata = () => ({
        texts: new BlockTextsType().metadata(),
        collectibles: new BlockCollectiblesSimpleType().metadata(),
        settings: new BlockSettingsType().metadata(),
    })
}
