import { ValidationArguments } from 'class-validator';
import { IComparisonParams } from '../types/scheme';

export const getTimestampByValidationArguments = (args: ValidationArguments): number | null => {
    const [params] = args.constraints;
    const { property, date, defaultDate } = params as IComparisonParams;

    if (property) {
        const value = args.object[property];

        if (!value) {
            return defaultDate ? defaultDate().getTime() : null;
        }

        return new Date(value).getTime();
    }

    if (!date) {
        return null;
    }

    return date().getTime();
}
