import { ApiProperty } from '@nestjs/swagger';
import { IStoreFrontPageBlockSettingTexts } from '../schemas/store-fronts.schema';

export class StoreFrontPageBlockSettingTextsDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    headline: string;

    constructor(texts: IStoreFrontPageBlockSettingTexts) {
        this.name = texts.name;
        this.headline = texts.headline;
    }
}
