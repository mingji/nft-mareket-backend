import { ApiProperty } from '@nestjs/swagger';
import { ITokenMetadataDocument } from '../../schemas/token-metadata.schema';
import { MetadataAttributeDto } from './metadata-attribute.dto';

export class TokenMetadataDto {
    @ApiProperty()
    image: string;

    @ApiProperty()
    image_data?: string;

    @ApiProperty()
    external_url?: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ type: [MetadataAttributeDto] })
    attributes?: MetadataAttributeDto[];

    @ApiProperty()
    background_color?: string;

    @ApiProperty()
    animation_url?: string;

    @ApiProperty()
    youtube_url?: string;

    constructor(metadata: ITokenMetadataDocument) {
        this.image = metadata.image.location;
        this.image_data = metadata.image_data ?? undefined;
        this.external_url = metadata.external_url ?? undefined;
        this.description = metadata.description;
        this.name = metadata.name;
        this.attributes = metadata.attributes?.length
            ? metadata.attributes.map(attr => new MetadataAttributeDto(attr))
            : undefined;
        this.background_color = metadata.background_color ?? undefined;
        this.animation_url = metadata.animation?.location;
        this.youtube_url = metadata.youtube_url ?? undefined;
    }
}
