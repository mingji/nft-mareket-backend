import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';

export function ToId() {
    return applyDecorators(
        Transform((item) => item.value?._id ?? item.value),
        Type(() => String)
    );
}