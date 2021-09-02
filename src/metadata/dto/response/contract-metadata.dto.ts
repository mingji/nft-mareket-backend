import { ApiProperty } from '@nestjs/swagger';
import { IContractMetadataDocument } from '../../schemas/contract-metadata.schema';
import { LinksDto } from '../../../dto/links.dto';
import { S3FilePublicDto } from '../../../dto/s3-file-public.dto';
import { ToS3FilePublic } from '../../../decorators/to-s3-file-public.decorator';

export class ContractMetadataDto {
    @ApiProperty()
    symbol: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty({ type: S3FilePublicDto })
    @ToS3FilePublic()
    logo: S3FilePublicDto;

    @ApiProperty({ type: LinksDto })
    links: LinksDto;

    constructor(contractMetadataDocument: IContractMetadataDocument) {
        this.symbol = contractMetadataDocument.symbol;
        this.name = contractMetadataDocument.name;
        this.description = contractMetadataDocument.description;
        this.logo = contractMetadataDocument.logo;
        this.links = contractMetadataDocument.links ? new LinksDto(contractMetadataDocument.links) : undefined;
    }
}
