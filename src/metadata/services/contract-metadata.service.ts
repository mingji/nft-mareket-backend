import { Injectable } from '@nestjs/common';
import { MongooseService } from '../../dao/mongoose/mongoose.service';
import { IS3File } from '../../types/scheme';
import { ContractMetadataDao } from '../dao/contract-metadata.dao';
import { StoreContractMetadataDto } from '../dto/request/store-contract-metadata.dto';
import { IContractMetadataDocument } from '../schemas/contract-metadata.schema';
import { StorageService } from '../../utils/storage.service';
import { UpdateTokenCollectionDto } from '../../tokenCollections/dto/request/update-token-collection.dto';

@Injectable()
export class ContractMetadataService extends MongooseService {
    constructor(
        private readonly contractMetadataDao: ContractMetadataDao,
        private readonly storageService: StorageService
    ) {
        super();
    }

    protected get dao(): ContractMetadataDao {
        return this.contractMetadataDao;
    }

    async storeMetadata(
        userId: string,
        data: StoreContractMetadataDto,
        logo?: IS3File
    ): Promise<IContractMetadataDocument> {
        return this.dao.storeMetadata(userId, data, logo);
    }

    async updateMetadata(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<IContractMetadataDocument> {
        return this.dao.updateMetadata(slug, data, logo);
    }

    async existsMetadataBySlug(slug: string): Promise<boolean> {
        return this.dao.existsMetadataBySlug(slug);
    }

    async findMetadataByUserIdAndSlug(
        userId: string,
        slug: string
    ): Promise<IContractMetadataDocument | null> {
        return this.dao.findMetadataByUserIdAndSlug(userId, slug);
    }

    async storeLogo(
        userId: string,
        slug: string,
        logo: Express.Multer.File
    ): Promise<IS3File | null> {
        return this.storageService.upload(logo, `metadata/${userId}/contracts/${slug}`);
    }

    async attachTokenCollection(
        metadataId: string,
        tokenCollectionId: string,
        contractAddress: string
    ): Promise<void> {
        return this.dao.attachTokenCollection(metadataId, tokenCollectionId, contractAddress);
    }
}
