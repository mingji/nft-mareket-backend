import { PipeTransform, Injectable, NotFoundException } from '@nestjs/common';
import { IsNotEmpty, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { IsSlug } from '../decorators/validations/is-slug';

class Dto {
    @IsNotEmpty()
    @IsSlug()
    slug: string;
}

@Injectable()
export class IsSlugPipe implements PipeTransform<string> {
    transform(slug: string): string {
        try {
            validateSync(plainToClass(Dto, { slug }));
        } catch (e) {
            throw new NotFoundException();
        }

        return slug;
    }
}
