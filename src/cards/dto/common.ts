import { ApiProperty } from '@nestjs/swagger';
import { S3FilePublicDto } from '../../dto/s3-file-public.dto';
import { ICardDocument } from '../schemas/cards.schema';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';

export class ChainInfoDto {
    @ApiProperty()
    address: string;

    @ApiProperty()
    tokenId: number;

    @ApiProperty()
    blockchain: string;

    constructor(tokenCollection: Partial<ITokenCollectionDocument>, card: Partial<ICardDocument>) {
        this.address = tokenCollection.contractId;
        this.tokenId = card.identifier;
        this.blockchain = tokenCollection.blockchain;
    }
}

export class PropertyDto {
    @ApiProperty()
    property: string;

    @ApiProperty()
    value: string;

    constructor(partial: Partial<PropertyDto>) {
        this.property = partial.property;
        this.value = partial.value;
    }
}

export class FileCardDto {
    @ApiProperty()
    original: S3FilePublicDto;

    @ApiProperty()
    preview: S3FilePublicDto;
}
