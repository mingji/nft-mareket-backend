import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    isDate,
    isNumber, isString
} from 'class-validator';
import { MetadataAttributeDto } from '../store-token-metadata.dto';
import { DisplayType } from '../../../types/enums';
import { NumberDisplayTypes } from '../../../types/constants';
import { Errors } from '../../../types/errors';

@ValidatorConstraint({ name: 'IsValidAttributeValue', async: false })
class IsValidAttributeValueConstraint implements ValidatorConstraintInterface {
    public validate(value: any, args: ValidationArguments) {
        const { display_type } = args.object as MetadataAttributeDto;

        try {
            if (display_type === DisplayType.date) {
                return isDate(value);
            }

            if (NumberDisplayTypes.includes(display_type)) {
                return isNumber(value);
            }

            return isString(value);
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        return Errors.WRONG_VALUE;
    }
}

export function IsValidAttributeValue(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsValidAttributeValue',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsValidAttributeValueConstraint
        });
    };
}
