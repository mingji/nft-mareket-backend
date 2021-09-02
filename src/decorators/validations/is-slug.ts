import { applyDecorators, BadRequestException } from '@nestjs/common';
import { IsOptional, IsString, Matches, validateSync } from 'class-validator';
import { Errors } from '../../types/errors';
import { plainToClass, Transform } from 'class-transformer';
import { TransformFnParams } from 'class-transformer/types/interfaces';
import slugify from 'slugify';

class Dto {
    @IsOptional()
    @IsString()
    @Matches(
        '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        'igm',
        { message: Errors.WRONG_SLUG_FORMAT }
    )
    value: string;
}

export function IsSlug(isOptional = false) {
    return applyDecorators(
        Transform(({ value }: TransformFnParams) => {
            if (isOptional && !value) {
                return null;
            }

            const errors: any = validateSync(plainToClass(Dto, { value }));

            if (errors.length > 0) {
                throw new BadRequestException(errors);
            }

            try {
                return slugify(value);
            } catch (e) {
                throw new BadRequestException(e.message);
            }
        })
    );
}