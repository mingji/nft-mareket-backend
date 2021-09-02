import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { IComparisonParams } from './types/scheme';
import { getTimestampByValidationArguments } from './helpers/common';
import { Errors } from './types/errors';

@ValidatorConstraint({ name: 'MinTimestamp', async: false })
class MinTimestampConstraint implements ValidatorConstraintInterface {
    public validate(value: string, args: ValidationArguments) {
        try {
            const valueTimestamp = new Date(value).getTime();
            const minTimestamp = getTimestampByValidationArguments(args);

            if (minTimestamp === null) {
                return true;
            }

            if (isNaN(minTimestamp) || isNaN(valueTimestamp)) {
                return false;
            }

            return valueTimestamp <= minTimestamp;
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        try {
            const minDate = getTimestampByValidationArguments(args);

            if (minDate === null || isNaN(minDate)) {
                return Errors.INVALID_DATA;
            }

            return `Min allowed date for $property is ${new Date(minDate).toDateString()}`;
        } catch (e) {
            return Errors.INVALID_DATA;
        }
    }
}

export function MinTimestamp(params: IComparisonParams, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'MinTimestamp',
            target: object.constructor,
            propertyName,
            constraints: [params],
            options: validationOptions,
            validator: MinTimestampConstraint
        });
    };
}
