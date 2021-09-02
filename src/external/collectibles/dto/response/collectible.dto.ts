import { ApiProperty } from '@nestjs/swagger';
import { ICollectibleDocument } from '../../schemas/collectible.schema';
import { ToId } from '../../../../decorators/to-id.decorator';
import { BasicTokenMetadataDto } from '../../../../metadata/dto/response/basic-token-metadata.dto';
import { ITokenMetadataDocument } from '../../../../metadata/schemas/token-metadata.schema';

export class CollectibleDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    externalCollectibleId: string;

    @ApiProperty()
    externalStoreId?: string;

    @ApiProperty()
    externalCreatorId: string;

    @ApiProperty()
    externalCreatorEmail: string;

    @ApiProperty()
    maxSupply: number;

    @ApiProperty()
    distributedCount: number;

    @ApiProperty({ type: BasicTokenMetadataDto })
    metadata: BasicTokenMetadataDto;

    @ApiProperty()
    blockchain: any;

    constructor(collectible: Partial<ICollectibleDocument>) {
        const metadata = collectible.tokenMetadataId;
        this.id = collectible.id;
        this.externalCollectibleId = collectible.externalCollectibleId;
        this.externalStoreId = collectible.externalStoreId;
        this.externalCreatorId = collectible.externalCreatorId;
        this.externalCreatorEmail = collectible.externalCreatorEmail;
        this.maxSupply = collectible.maxSupply;
        this.distributedCount = collectible.distributedCount;
        this.metadata = new BasicTokenMetadataDto((metadata ?? {}) as ITokenMetadataDocument);
        //TODO: https://bondly.atlassian.net/browse/API-3 add blockchain data
        this.blockchain = undefined;
    }
}
