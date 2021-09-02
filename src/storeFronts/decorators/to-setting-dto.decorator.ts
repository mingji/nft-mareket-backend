import { applyDecorators, BadRequestException } from '@nestjs/common';
import { plainToClass, Transform } from 'class-transformer';
import { ClassConstructor, TransformFnParams } from 'class-transformer/types/interfaces';

export function ToSettingDto<T>(cls?: ClassConstructor<T>) {
    return applyDecorators(
        Transform(({ value, obj: { id } }: TransformFnParams) => {
            try {
                return plainToClass(cls, { ...value, id });
            } catch (e) {
                throw new BadRequestException(e.message);
            }
        })
    );
}
