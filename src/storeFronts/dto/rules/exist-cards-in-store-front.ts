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
@ValidatorConstraint({ name: 'ExistCardsInStoreFront', async: true })
export class ExistCardsInStoreFrontConstraint implements ValidatorConstraintInterface {
    constructor(
        protected readonly storeFrontDao: StoreFrontDao
    ) {}

    async validate(cards: string[], args: ValidationArguments): Promise<boolean> {
        try {
            const { id: storeFrontId } = args.object as any;
            if (!storeFrontId) {
                return false;
            }

            return this.storeFrontDao.existCardsInStoreFront(storeFrontId, cards);
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        return Errors.WRONG_CARDS_DATA;
    }
}

export function ExistCardsInStoreFront(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'ExistCardsInStoreFront',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: ExistCardsInStoreFrontConstraint
        });
    };
}
