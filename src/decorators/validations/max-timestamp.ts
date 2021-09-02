import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { getTimestampByValidationArguments } from './helpers/common';
import { IComparisonParams } from './types/scheme';
import { Errors } from './types/errors';

@ValidatorConstraint({ name: 'MaxTimestamp', async: false })
class MaxTimestampConstraint implements ValidatorConstraintInterface {
    public validate(value: string, args: ValidationArguments) {
        try {
            const valueTimestamp = new Date(value).getTime();
            const maxTimestamp = getTimestampByValidationArguments(args);

            if (maxTimestamp === null) {
                return true;
            }

            if (isNaN(maxTimestamp) || isNaN(valueTimestamp)) {
                return false;
            }

            return valueTimestamp >= maxTimestamp;
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        try {
            const maxDate = getTimestampByValidationArguments(args);

            if (maxDate === null || isNaN(maxDate)) {
                return Errors.INVALID_DATA;
            }

            return `Max allowed date for $property is ${new Date(maxDate).toDateString()}`;
        } catch (e) {
            return Errors.INVALID_DATA;
        }
    }
}

export function MaxTimestamp(params: IComparisonParams, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'MaxTimestamp',
            target: object.constructor,
            propertyName,
            constraints: [params],
            options: validationOptions,
            validator: MaxTimestampConstraint
        });
    };
}
