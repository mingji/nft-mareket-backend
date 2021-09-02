import { Dao } from '../../dao/dao';
import { IS3File } from '../../types/scheme';
import {
    ITokenMetadataAttribute,
    ITokenMetadataDocument,
    ITokenMetadataLeanDocument
} from '../schemas/token-metadata.schema';
import { IBasicTokenMetadataProperties } from '../types/scheme';

export abstract class TokenMetadataDao extends Dao {
    public abstract findMetadataByContractMetadataIdAndTokenIdentifier(
        contractMetadataId: string,
        token_identifier: number
    ): Promise<ITokenMetadataDocument>;

    public abstract getNextTokenIdentifier(contractMetadataId: string): Promise<number | null>;

    public abstract storeMetadata(
        tokenCollectionId: string | null,
        userId: string,
        contractMetadataId: string,
        contractAddress: string | null,
        token_identifier: number,
        name: string,
        image: IS3File,
        animation?: IS3File,
        image_data?: string,
        external_url?: string,
        description?: string | null,
        decimals?: number | null,
        properties?: IBasicTokenMetadataProperties | null,
        attributes?: ITokenMetadataAttribute[],
        background_color?: string,
        youtube_url?: string
    ): Promise<ITokenMetadataDocument>;

    public abstract getMetadataByContractAddressAndTokenIdentifiers(
        contractAddress: string,
        tokenIdentifiers: number[],
        lean?: boolean
    ): Promise<Array<ITokenMetadataDocument | ITokenMetadataLeanDocument>>;
}
