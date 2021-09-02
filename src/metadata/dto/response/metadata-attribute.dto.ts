import { ApiProperty } from '@nestjs/swagger';
import { ITokenMetadataAttribute } from '../../schemas/token-metadata.schema';
import { DisplayType } from '../../types/enums';

export class MetadataAttributeDto {
    @ApiProperty()
    trait_type?: string;

    @ApiProperty()
    value: any;

    @ApiProperty()
    max_value?: number;

    @ApiProperty({ enum: DisplayType })
    display_type?: DisplayType;

    constructor(attribute: ITokenMetadataAttribute) {
        this.trait_type = attribute.trait_type ?? undefined;
        this.value = attribute.value;
        this.max_value = attribute.max_value ?? undefined;
        this.display_type = attribute.display_type ?? undefined;
    }
}
