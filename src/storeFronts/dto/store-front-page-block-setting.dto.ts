import { ApiProperty } from '@nestjs/swagger';
import { IStoreFrontPageBlockSetting } from '../schemas/store-fronts.schema';
import { StoreFrontPageBlockSettingTextsDto } from './store-front-page-block-setting-texts.dto';
import { LinksDto } from '../../dto/links.dto';

export class StoreFrontPageBlockSettingDto {
    @ApiProperty({ type: StoreFrontPageBlockSettingTextsDto })
    texts: StoreFrontPageBlockSettingTextsDto;

    @ApiProperty()
    collectibles: any;

    @ApiProperty()
    settings: any;

    @ApiProperty({ type: LinksDto })
    links: LinksDto;

    constructor(setting: IStoreFrontPageBlockSetting) {
        this.texts = new StoreFrontPageBlockSettingTextsDto(setting.texts);
        this.collectibles = setting.collectibles;
        this.settings = setting.settings;
        this.links = setting.links ? new LinksDto(setting.links) : undefined;
    }
}
