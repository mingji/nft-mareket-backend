import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { Errors } from './types/errors';

@ValidatorConstraint({ name: 'IsToday', async: false })
class IsTodayConstraint implements ValidatorConstraintInterface {
    public validate(value: string) {
        const date = new Date(value);
        const today = new Date();

        return date.getUTCDate() === today.getUTCDate() &&
            date.getUTCMonth() === today.getUTCMonth() &&
            date.getUTCFullYear() === today.getUTCFullYear();
    }

    public defaultMessage() {
        return Errors.IS_TODAY;
    }
}

export function IsToday(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsToday',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: IsTodayConstraint
        });
    };
}
