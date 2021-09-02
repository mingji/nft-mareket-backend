import { IsBoolean, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BlockCollectiblesType, BlockSettingsType, BlockTextsType } from './shared.dto';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';
import { ToSettingDto } from '../../decorators/to-setting-dto.decorator';
import { EntityIdDto } from '../../../dto/entity-id.dto';
import { ToBoolean } from '../../../decorators/to-boolean.decorator';

export class BlockCollectiblesExtendedType extends BlockCollectiblesType implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    itemSize: string;

    @ApiProperty()
    @IsNotEmpty()
    rows: number;

    @ApiProperty()
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    showMore: boolean;

    metadata = () => ({
        ...super.metadata(),
        itemSize: 'string',
        rows: 'number',
        showMore: 'boolean',
    });
}

export class PageBlockMostPopularSettingsDto extends EntityIdDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockTextsType)
    texts: BlockTextsType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(BlockCollectiblesExtendedType)
    collectibles: BlockCollectiblesExtendedType;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => BlockSettingsType)
    settings: BlockSettingsType

    metadata = () => ({
        texts: new BlockTextsType().metadata(),
        collectibles: new BlockCollectiblesExtendedType().metadata(),
        settings: new BlockSettingsType().metadata(),
    })
}
