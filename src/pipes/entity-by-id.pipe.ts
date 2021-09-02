import {
    PipeTransform,
    NotFoundException,
    Inject,
    mixin,
    forwardRef
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { memoize } from '@nestjs/passport/dist/utils/memoize.util';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { EntityIdDto } from '../dto/entity-id.dto';

export const EntityByIdPipe: (mongooseService: Type<MongooseService>) => PipeTransform = memoize(createEntityByIdPipe);

function createEntityByIdPipe(mongooseService: Type<MongooseService>): Type<PipeTransform> {
    class MixinEntityByIdPipe implements PipeTransform {
        constructor(
            @Inject(forwardRef(() => mongooseService))
            private mongooseService: MongooseService
        ) {}

        async transform(id: string) {
            const errors: any = await validate(plainToClass(EntityIdDto, { id }));

            if (errors.length > 0) {
                throw new NotFoundException();
            }

            const entity = await this.mongooseService.getById(id);

            if (!entity) {
                throw new NotFoundException();
            }

            return entity;
        }
    }

    return mixin(MixinEntityByIdPipe);
}
