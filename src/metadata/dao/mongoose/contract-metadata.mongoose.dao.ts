import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { IContractMetadataDocument } from '../../schemas/contract-metadata.schema';
import { ContractMetadataDao } from '../contract-metadata.dao';
import { IS3File } from '../../../types/scheme';
import { StoreContractMetadataDto } from '../../dto/request/store-contract-metadata.dto';
import { UpdateTokenCollectionDto } from '../../../tokenCollections/dto/request/update-token-collection.dto';

@Injectable()
export class ContractMetadataMongooseDao extends DaoMongoose implements ContractMetadataDao {
    @InjectModel(DaoModelNames.contractMetadata)
    private readonly contractMetadataModel: Model<IContractMetadataDocument>;

    protected get model(): Model<IContractMetadataDocument> {
        return this.contractMetadataModel;
    }

    async storeMetadata(
        userId: string,
        data: StoreContractMetadataDto,
        logo: IS3File
    ): Promise<IContractMetadataDocument> {
        return this.contractMetadataModel.create({ userId, ...data, logo });
    }

    async updateMetadata(
        slug: string,
        data: UpdateTokenCollectionDto,
        logo?: IS3File
    ): Promise<IContractMetadataDocument> {
        return this.model.findOneAndUpdate(
            { slug },
            { ...data, ...( logo ? { logo } : null ) }
        );
    }

    async existsMetadataBySlug(slug: string): Promise<boolean> {
        return this.contractMetadataModel.exists({ slug });
    }

    async findMetadataByUserIdAndSlug(
        userId: string,
        slug: string
    ): Promise<IContractMetadataDocument | null> {
        return this.contractMetadataModel.findOne({ userId, slug });
    }

    async attachTokenCollection(
        metadataId: string,
        tokenCollectionId: string,
        contractAddress: string
    ): Promise<void> {
        await this.model.findByIdAndUpdate(metadataId, { tokenCollectionId, contractAddress });
    }
}
