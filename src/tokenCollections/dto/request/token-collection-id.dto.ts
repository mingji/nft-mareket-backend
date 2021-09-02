import { IsMongoId, IsNotEmpty } from 'class-validator';

export class TokenCollectionIdDto {
    @IsNotEmpty()
    @IsMongoId()
    tokenCollectionId: string;
}
