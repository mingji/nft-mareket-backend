import { ApiProperty } from '@nestjs/swagger';
import { IBasicTokenMetadataProperties } from '../../types/scheme';
import { ITokenMetadataDocument } from '../../schemas/token-metadata.schema';

export class BasicTokenMetadataDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    decimals?: number;

    @ApiProperty()
    description?: string;

    @ApiProperty()
    image?: string;

    @ApiProperty()
    properties?: IBasicTokenMetadataProperties;

    constructor(metadata: ITokenMetadataDocument) {
        this.name = metadata.name;
        this.decimals = metadata.decimals ?? undefined;
        this.description = metadata.description ?? undefined;
        this.image = metadata.image?.location;
        this.properties = metadata.properties ?? undefined;
    }
}
