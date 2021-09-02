import { ApiProperty } from '@nestjs/swagger';
import { S3FilePublicDto } from '../../../dto/s3-file-public.dto';
import { ICardDocument } from '../../../cards/schemas/cards.schema';
import { CardBlockDto } from '../../../cards/dto/card-block.dto';
import { UserDto } from '../../../users/dto/user.dto';
import { IUserDocument } from '../../../users/schemas/user.schema';
import { ITokenCollectionLeanDocument } from '../../schemas/token-collection.schema';

export class UserTokenCollectionDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ type: S3FilePublicDto })
    logo: S3FilePublicDto;

    @ApiProperty({ type: [CardBlockDto] })
    cards: CardBlockDto[];

    @ApiProperty()
    cardsCount: number;

    @ApiProperty()
    soldCardsCount: number;

    @ApiProperty()
    contractAddress: string;

    @ApiProperty({ type: UserDto })
    creator: UserDto;

    @ApiProperty()
    userCardsCount?: number;

    constructor(collection: { userCardsCount?: number } & Partial<ITokenCollectionLeanDocument>) {
        const cards = collection.cards as ICardDocument[];
        this.id = (collection.id ?? collection._id).toString();
        this.logo = new S3FilePublicDto(collection.logo);
        this.cards = cards.map(card => new CardBlockDto(card));
        this.name = collection.name;
        this.cardsCount = collection.cardsCount as number;
        this.soldCardsCount = 0; //TODO: STUB for sold cards
        this.contractAddress = collection.contractId;
        this.creator = new UserDto((collection?.user ?? collection?.userId) as IUserDocument);
        this.userCardsCount = collection.userCardsCount;
    }
}
