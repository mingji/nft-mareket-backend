import { applyDecorators, BadRequestException } from '@nestjs/common';
import { plainToClass, Transform } from 'class-transformer';
import { ClassConstructor, TransformFnParams } from 'class-transformer/types/interfaces';

export function ToObject<T>(cls?: ClassConstructor<T>) {
    return applyDecorators(
        Transform(({ value }: TransformFnParams) => {
            try {
                if (!(value instanceof Object)) {
                    value = JSON.parse(value);
                }

                if (!cls) {
                    return value;
                }

                return plainToClass(cls, value);
            } catch (e) {
                throw new BadRequestException(e.message);
            }
        })
    );
}
