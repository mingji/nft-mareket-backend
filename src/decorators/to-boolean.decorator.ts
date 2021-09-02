import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function ToBoolean() {
    return applyDecorators(
        Transform(v => ['1', 1, 'true', true].includes(v.value))
    );
}