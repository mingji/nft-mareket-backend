import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BlockCollectiblesType, BlockTextsType } from './shared.dto';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';
import { ToSettingDto } from '../../decorators/to-setting-dto.decorator';
import { EntityIdDto } from '../../../dto/entity-id.dto';
import { Type } from 'class-transformer';

export class PageBlockHeaderSettingsDto extends EntityIdDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockTextsType)
    texts: BlockTextsType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(BlockCollectiblesType)
    collectibles: BlockCollectiblesType;

    metadata = () => ({
        texts: new BlockTextsType().metadata(),
        collectibles: new BlockCollectiblesType().metadata()
    })
}
