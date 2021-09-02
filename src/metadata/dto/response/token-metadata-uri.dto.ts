import { ApiProperty } from '@nestjs/swagger';
import { IContractMetadataDocument } from '../../schemas/contract-metadata.schema';
import { MetadataController } from '../../metadata.controller';
import { route } from '../../../helpers/url';
import { blockchainConfig } from '../../../config';

export class TokenMetadataUriDto {
    @ApiProperty()
    uri: string;

    constructor({ userId, slug }: IContractMetadataDocument, tokenIdentifier: number) {
        this.uri = route(
            MetadataController,
            'getTokenMetadata',
            { userId, slug, tokenIdentifier },
            blockchainConfig().metadataUriDomain
        );
    }
}
