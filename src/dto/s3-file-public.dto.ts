import { ApiProperty } from '@nestjs/swagger';
import { IS3File } from '../types/scheme';

export class S3FilePublicDto {
    @ApiProperty()
    key: string;

    @ApiProperty()
    location: string;

    @ApiProperty()
    bucket: string;

    @ApiProperty()
    mimetype: string;

    @ApiProperty()
    extension: string;

    constructor(file: Partial<IS3File>) {
        this.key = file?.key;
        this.location = file?.location;
        this.bucket = file?.bucket;
        this.mimetype = file?.mimetype;
        this.extension = file?.extension;
    }
}
