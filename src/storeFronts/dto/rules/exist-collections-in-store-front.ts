import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { StoreFrontDao } from '../../dao/store-front.dao';
import { Errors } from '../../types/errors';

@Injectable()
@ValidatorConstraint({ name: 'ExistCollectionsInStoreFront', async: true })
export class ExistCollectionsInStoreFrontConstraint implements ValidatorConstraintInterface {
    constructor(
        protected readonly storeFrontDao: StoreFrontDao
    ) {}

    async validate(collections: string[], args: ValidationArguments): Promise<boolean> {
        try {
            const { id: storeFrontId } = args.object as any;
            if (!storeFrontId) {
                return false;
            }

            return this.storeFrontDao.existCollectionsInStoreFront(storeFrontId, collections);
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        return Errors.WRONG_COLLECTIONS_DATA;
    }
}

export function ExistCollectionsInStoreFront(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'ExistCollectionsInStoreFront',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: ExistCollectionsInStoreFrontConstraint
        });
    };
}
