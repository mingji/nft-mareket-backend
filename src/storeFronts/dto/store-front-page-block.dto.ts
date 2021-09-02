import { ApiProperty } from '@nestjs/swagger';
import { IStoreFrontPageBlock } from '../schemas/store-fronts.schema';
import { StoreFrontPageBlockSettingDto } from './store-front-page-block-setting.dto';

export class StoreFrontPageBlockDto {
    @ApiProperty()
    type: string;

    @ApiProperty({ type: StoreFrontPageBlockSettingDto })
    settings: StoreFrontPageBlockSettingDto;

    @ApiProperty()
    sortOrder: number;

    @ApiProperty()
    isVisible: boolean;

    constructor(block: IStoreFrontPageBlock) {
        this.type = block.type;
        this.settings = new StoreFrontPageBlockSettingDto(block.settings);
        this.sortOrder = block.sortOrder;
        this.isVisible = block.isVisible;
    }
}
