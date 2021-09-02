import { IsMongoId } from 'class-validator';

export class EntityIdDto {
    @IsMongoId()
    id: string;
}