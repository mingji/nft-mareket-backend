import { SortOrder } from '../../types/constants';
import { ITokenCollectionDocument } from '../schemas/token-collection.schema';
import { Dao } from '../../dao/dao';
import { IPaginatedList } from 'src/types/common';
import { Network } from '../../config/types/constants';
import { IContractMetadataDocument } from '../../metadata/schemas/contract-metadata.schema';
import { GetUserCollectionsDto } from '../dto/request/get-user-collections.dto';
import { UpdateTokenCollectionDto } from '../dto/request/update-token-collection.dto';
import { IS3File } from '../../types/scheme';

export interface IGetListQuery {
    categories?: Array<string>,
    offset?: number,
    limit: number,
    createdAtOrder?: SortOrder,
    popularityOrder?: SortOrder,
    name?: string
}

export abstract class TokenCollectionDao extends Dao {
    static readonly LIMIT_CARDS_PER_COLLECTION: number = 4;

    public abstract getUserCreatedCollections(
        userId: string,
        limit: number,
        offset: number,
        sort: SortOrder
    ): Promise<IPaginatedList<ITokenCollectionDocument>>;

    public abstract getUserCollections(
        userId: string,
        query: GetUserCollectionsDto
    ): Promise<IPaginatedList<ITokenCollectionDocument>>;

    public abstract getCollectionsListByIds(
        ids: string[],
        limit: number,
        offset: number,
        sort: SortOrder
    ): Promise<IPaginatedList<ITokenCollectionDocument>>;

    public abstract getCollectionsListByFilter(
        query: IGetListQuery,
        lean?: boolean
    ): Promise<ITokenCollectionDocument[]>;

    public abstract getCollectionsTotalRecordsByFilter(query: IGetListQuery): Promise<number>;

    public abstract findCollectionByContractId(contractId: string): Promise<ITokenCollectionDocument | null>;

    public abstract createCollection(
        blockchain: Network,
        contractId: string,
        userId: string,
        name: string,
        metadata?: IContractMetadataDocument,
        uri?: string
    ): Promise<ITokenCollectionDocument | null>;

    public abstract updateCollection(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<ITokenCollectionDocument>;
}
