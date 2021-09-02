import { ApiProperty } from '@nestjs/swagger';
import { IPageSettingMetadata } from '../types/scheme';

export class StoreFrontSettingsMetaDto {
    @ApiProperty()
    settings: IPageSettingMetadata[];

    @ApiProperty()
    pages: string[];

    constructor(settings: IPageSettingMetadata[], pages: string[]) {
        this.settings = settings;
        this.pages = pages;
    }
}
