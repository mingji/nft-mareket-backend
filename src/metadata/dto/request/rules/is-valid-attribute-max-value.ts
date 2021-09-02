import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { MetadataAttributeDto } from '../store-token-metadata.dto';
import { NumberDisplayTypes } from '../../../types/constants';
import { Errors } from '../../../types/errors';

@ValidatorConstraint({ name: 'IsValidAttributeMaxValue', async: false })
class IsValidAttributeMaxValueConstraint implements ValidatorConstraintInterface {
    public validate(maxVal: any, args: ValidationArguments) {
        const { display_type, value } = args.object as MetadataAttributeDto;

        try {
            if (!NumberDisplayTypes.includes(display_type)) {
                return false;
            }

            return maxVal >= value;
        } catch (e) {
            return false;
        }
    }

    public defaultMessage(args: ValidationArguments) {
        return Errors.WRONG_VALUE;
    }
}

export function IsValidAttributeMaxValue(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsValidAttributeMaxValue',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsValidAttributeMaxValueConstraint
        });
    };
}
