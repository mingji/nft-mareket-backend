import { ApiProperty } from '@nestjs/swagger';
import { CardBlockDto } from '../../../cards/dto/card-block.dto';
import { ICardDocument } from '../../../cards/schemas/cards.schema';
import { ITokenCollectionDocument } from '../../../tokenCollections/schemas/token-collection.schema';
import { TokenCollectionShortDto } from '../../../tokenCollections/dto/response/token-collection-short.dto';

export class SearchDto {
    @ApiProperty({ type: [TokenCollectionShortDto] })
    collections: TokenCollectionShortDto[];

    @ApiProperty({ type: [CardBlockDto] })
    cards: CardBlockDto[];

    constructor(collections: ITokenCollectionDocument[], cards: ICardDocument[]) {
        this.collections = collections.map(c => new TokenCollectionShortDto(c));
        this.cards = cards.map(c => new CardBlockDto(c));
    }
}