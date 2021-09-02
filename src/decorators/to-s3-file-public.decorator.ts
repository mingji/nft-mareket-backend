import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { S3FilePublicDto } from '../dto/s3-file-public.dto';

export function ToS3FilePublic() {
    return applyDecorators(
        Transform((preview) => new S3FilePublicDto(preview.value))
    );
}