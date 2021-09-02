import { ApiProperty } from '@nestjs/swagger';
import { IStoreFrontPage } from '../schemas/store-fronts.schema';
import { StoreFrontPageBlockDto } from './store-front-page-block.dto';
import { IS3File } from '../../types/scheme';
import { S3FilePublicDto } from '../../dto/s3-file-public.dto';
import { ToS3FilePublic } from '../../decorators/to-s3-file-public.decorator';

export class StoreFrontPageDto {
    @ApiProperty()
    name: string;

    @ApiProperty({ type: [StoreFrontPageBlockDto] })
    blocks: StoreFrontPageBlockDto[];

    @ApiProperty({ type: S3FilePublicDto })
    @ToS3FilePublic()
    logo: S3FilePublicDto;

    constructor(storeFrontPage: IStoreFrontPage, storeFrontLogo?: IS3File) {
        this.name = storeFrontPage.name;
        this.blocks = storeFrontPage.blocks.map(block => new StoreFrontPageBlockDto(block));
        this.logo = storeFrontLogo;
    }
}
