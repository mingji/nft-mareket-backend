import { StoreFrontPageBlock } from '../types/enums';
import { IsBoolean, IsEmpty, IsEnum, IsInt, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { PageBlockHeaderSettingsDto } from './store-front-blocks/page-block-header-settings.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PageBlockMostPopularSettingsDto } from './store-front-blocks/page-block-most-popular-settings.dto';
import { PageBlockDigitalCollectionSettingsDto } from './store-front-blocks/page-block-digital-collection-settings.dto';
import { PageBlockWhatIsSettingsDto } from './store-front-blocks/page-block-what-is-settings.dto';
import { PageBlockSubscribeSettingsDto } from './store-front-blocks/page-block-subscribe-settings.dto';
import { PageBlockAboutSettingsDto } from './store-front-blocks/page-block-about-settings.dto';
import { HasMetadataDto } from '../../dto/abstract/has-metadata.dto';
import { ToBoolean } from '../../decorators/to-boolean.decorator';
import { EntityIdDto } from '../../dto/entity-id.dto';
import { ToSettingDto } from '../decorators/to-setting-dto.decorator';

class BaseStoreFrontSettingsDto extends EntityIdDto {
    @ApiProperty()
    @IsEnum(StoreFrontPageBlock)
    @IsNotEmpty()
    readonly type: StoreFrontPageBlock;

    @ApiProperty()
    @IsEmpty({ groups: [StoreFrontPageBlock.HEADER, StoreFrontPageBlock.FOOTER] })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    readonly sortOrder: number | null;

    @ApiProperty()
    @IsEmpty({ groups: [StoreFrontPageBlock.HEADER, StoreFrontPageBlock.FOOTER] })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    readonly isVisible: boolean;
}

export class StoreFrontPageBlockHeaderDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockHeaderSettingsDto)
    readonly settings: PageBlockHeaderSettingsDto;

    metadata(type: string) {
        return { type, settings: new PageBlockHeaderSettingsDto().metadata() };
    }
}

export class StoreFrontPageBlockMostPopularDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockMostPopularSettingsDto)
    readonly settings: PageBlockMostPopularSettingsDto;

    metadata = (type) => ({ type, settings: new PageBlockMostPopularSettingsDto().metadata() })
}

export class StoreFrontPageBlockDigitalCollectionDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockDigitalCollectionSettingsDto)
    readonly settings: PageBlockDigitalCollectionSettingsDto;

    metadata = (type) => ({ type, settings: new PageBlockDigitalCollectionSettingsDto().metadata() })
}

export class StoreFrontPageBlockWhatIsDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockWhatIsSettingsDto)
    readonly settings: PageBlockWhatIsSettingsDto;

    metadata = (type) => ({ type, settings: new PageBlockWhatIsSettingsDto().metadata() })
}

export class StoreFrontPageBlockSubscribeDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockSubscribeSettingsDto)
    readonly settings: PageBlockSubscribeSettingsDto;

    metadata = (type) => ({ type, settings: new PageBlockSubscribeSettingsDto().metadata() })
}

export class StoreFrontPageBlockAboutDto extends BaseStoreFrontSettingsDto implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @ToSettingDto(PageBlockAboutSettingsDto)
    readonly settings: PageBlockAboutSettingsDto;

    metadata = (type) => ({ type, settings: new PageBlockAboutSettingsDto().metadata() })
}

export type StoreFrontPageBlockDto = Array<StoreFrontPageBlockHeaderDto |
    StoreFrontPageBlockMostPopularDto |
    StoreFrontPageBlockDigitalCollectionDto |
    StoreFrontPageBlockWhatIsDto |
    StoreFrontPageBlockSubscribeDto |
    StoreFrontPageBlockAboutDto>
