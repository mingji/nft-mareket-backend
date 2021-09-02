import { Dao } from '../../dao/dao';
import { IS3File } from '../../types/scheme';
import { IContractMetadataDocument } from '../schemas/contract-metadata.schema';
import { StoreContractMetadataDto } from '../dto/request/store-contract-metadata.dto';
import { UpdateTokenCollectionDto } from '../../tokenCollections/dto/request/update-token-collection.dto';

export abstract class ContractMetadataDao extends Dao {
    public abstract storeMetadata(
        userId: string,
        data: StoreContractMetadataDto,
        logo: IS3File
    ): Promise<IContractMetadataDocument>;

    public abstract updateMetadata(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<IContractMetadataDocument>;

    public abstract existsMetadataBySlug(slug: string): Promise<boolean>;

    public abstract findMetadataByUserIdAndSlug(
        userId: string,
        slug: string
    ): Promise<IContractMetadataDocument | null>;

    public abstract attachTokenCollection(
        metadataId: string,
        tokenCollectionId: string,
        contractAddress: string
    ): Promise<void>;
}
