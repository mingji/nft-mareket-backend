import { IsMongoId } from 'class-validator';

export class CardIdDto {
    @IsMongoId()
    cardId: string;
}
