import { IsMongoId } from 'class-validator';

export class StoreFrontIdDto {
    @IsMongoId()
    id: string;
}