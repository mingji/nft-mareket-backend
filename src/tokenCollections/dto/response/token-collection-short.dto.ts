import { ApiProperty } from '@nestjs/swagger';
import { ToId } from '../../../decorators/to-id.decorator';
import { ToS3FilePublic } from '../../../decorators/to-s3-file-public.decorator';
import { ITokenCollectionDocument } from '../../schemas/token-collection.schema';
import { S3FilePublicDto } from '../../../dto/s3-file-public.dto';
import { SaleContractDto } from './sale-contract.dto';
import { ObjectID } from 'mongodb';

export class TokenCollectionShortDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    popularity: number;

    @ApiProperty({ type: SaleContractDto })
    saleContract: SaleContractDto;

    @ApiProperty()
    @ToS3FilePublic()
    logo: S3FilePublicDto;

    constructor(tokenCollection: Partial<ITokenCollectionDocument>) {
        if (tokenCollection instanceof ObjectID) {
            tokenCollection = { id: tokenCollection }
        }

        if (typeof tokenCollection === 'string') {
            tokenCollection = { id: tokenCollection }
        }

        this.id = tokenCollection.id;
        this.name = tokenCollection.name;
        this.popularity = tokenCollection.popularity;
        this.logo = tokenCollection?.logoPublic || tokenCollection.logo;
        if (tokenCollection.saleContract) {
            this.saleContract = new SaleContractDto(tokenCollection.saleContract);
        }
    }
}