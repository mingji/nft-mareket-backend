import { ApiProperty } from "@nestjs/swagger";
import { ToId } from '../../../decorators/to-id.decorator';
import { ToS3FilePublic } from '../../../decorators/to-s3-file-public.decorator';
import { S3FilePublicDto } from '../../../dto/s3-file-public.dto';
import { LinksDto } from '../../../dto/links.dto';
import { ITokenCollectionDocument } from '../../schemas/token-collection.schema';
import { SaleContractDto } from './sale-contract.dto';

export class TokenCollectionDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    @ToId()
    userId: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    symbol: string;

    @ApiProperty()
    @ToS3FilePublic()
    logo: S3FilePublicDto;

    @ApiProperty()
    description?: string;

    @ApiProperty()
    slug?: string;

    @ApiProperty( { type: LinksDto } )
    links?: LinksDto;

    @ApiProperty()
    categoryIds: string[];

    @ApiProperty()
    popularity: number;

    @ApiProperty()
    createdAt: Date

    @ApiProperty()
    contractAddress: string;

    @ApiProperty({ type: SaleContractDto })
    saleContract: SaleContractDto;

    constructor (tokenCollection: ITokenCollectionDocument) {
        this.id = tokenCollection.id;
        this.name = tokenCollection.name;
        this.categoryIds = tokenCollection.categoryIds.map(category => category.toString());
        this.userId = tokenCollection.userId?.toString();
        this.links = tokenCollection.links ? new LinksDto(tokenCollection.links) : null;
        this.createdAt = tokenCollection.createdAt;
        this.popularity = tokenCollection.popularity;
        this.slug = tokenCollection.slug;
        this.symbol = tokenCollection.symbol;
        this.logo = new S3FilePublicDto(tokenCollection.logoPublic);
        this.description = tokenCollection.description;
        this.contractAddress = tokenCollection.contractId;
        this.saleContract = new SaleContractDto(tokenCollection.saleContract);
    }
}