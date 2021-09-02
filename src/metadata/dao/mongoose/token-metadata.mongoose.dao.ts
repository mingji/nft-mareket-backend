import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { IS3File } from '../../../types/scheme';
import { TokenMetadataDao } from '../token-metadata.dao';
import {
    ITokenMetadataAttribute,
    ITokenMetadataDocument,
    ITokenMetadataLeanDocument,
    ITokenMetadataQuery
} from '../../schemas/token-metadata.schema';
import { ObjectID } from 'mongodb';
import { IBasicTokenMetadataProperties } from '../../types/scheme';

@Injectable()
export class TokenMetadataMongooseDao extends DaoMongoose implements TokenMetadataDao {
    @InjectModel(DaoModelNames.tokenMetadata) private readonly metadataModel: Model<ITokenMetadataDocument>;

    protected get model(): Model<ITokenMetadataDocument> {
        return this.metadataModel;
    }

    async findMetadataByContractMetadataIdAndTokenIdentifier(
        contractMetadataId: string,
        token_identifier: number
    ): Promise<ITokenMetadataDocument> {
        return this.model.findOne({ contractMetadataId, token_identifier });
    }

    async getNextTokenIdentifier(contractMetadataId: string): Promise<number | null> {
        const res = await this.model.aggregate([
            {
                $match: { contractMetadataId: new ObjectID(contractMetadataId) }
            },
            {
                $group: {
                    _id: null,
                    maxIdentifier: { $max: '$token_identifier' }
                }
            },
            {
                $project: {
                    _id: 0,
                    maxIdentifier: 1
                }
            }
        ]);

        return (res.length ? res[0].maxIdentifier : 0) + 1;
    }

    async storeMetadata(
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
    ): Promise<ITokenMetadataDocument> {
        return this.metadataModel.create({
            tokenCollectionId,
            userId,
            contractAddress,
            contractMetadataId,
            token_identifier,
            image,
            animation,
            image_data,
            external_url,
            description,
            decimals,
            name,
            attributes,
            properties,
            background_color,
            youtube_url,
        });
    }

    async getMetadataByContractAddressAndTokenIdentifiers(
        contractAddress: string,
        tokenIdentifiers: number[],
        lean = false
    ): Promise<Array<ITokenMetadataDocument | ITokenMetadataLeanDocument>> {
        const query = this.model.find({
            contractAddress,
            token_identifier: { $in: tokenIdentifiers }
        }) as ITokenMetadataQuery<ITokenMetadataDocument[]>;

        if (!lean) {
            return query;
        }

        return query.additionalLean();
    }
}
