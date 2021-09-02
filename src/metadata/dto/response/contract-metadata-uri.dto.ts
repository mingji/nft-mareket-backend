import { ApiProperty } from '@nestjs/swagger';
import { IContractMetadataDocument } from '../../schemas/contract-metadata.schema';
import { MetadataController } from '../../metadata.controller';
import { route } from '../../../helpers/url';
import { blockchainConfig } from '../../../config';

export class ContractMetadataUriDto {
    @ApiProperty()
    uri: string;

    constructor({ userId, slug }: IContractMetadataDocument) {
        this.uri = route(
            MetadataController,
            'getContractMetadata',
            { userId, slug },
            blockchainConfig().metadataUriDomain,
            true
        );
    }
}
