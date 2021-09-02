import { Injectable } from '@nestjs/common';
import { MongooseService } from '../../dao/mongoose/mongoose.service';
import { IS3File } from '../../types/scheme';
import { TokenMetadataDao } from '../dao/token-metadata.dao';
import {
    ITokenMetadataAttribute,
    ITokenMetadataDocument,
    ITokenMetadataLeanDocument
} from '../schemas/token-metadata.schema';
import { MetadataError } from '../errors/metadata.error';
import { Errors } from '../types/errors';
import { Errors as CommonErrors } from '../../types/errors';
import { animationFileFilter, imageFileFilter } from '../../utils/file-upload.utils';
import { StorageService } from '../../utils/storage.service';
import { IBasicTokenMetadataProperties, IStoredTokenFiles } from '../types/scheme';
import { FilesService } from '../../files/files.service';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { IS3Config } from '../../config';
import { getFileTypeFromBuffer } from '../../helpers/file';

@Injectable()
export class TokenMetadataService extends MongooseService {
    constructor(
        private readonly metadataDao: TokenMetadataDao,
        private readonly storageService: StorageService,
        private readonly filesService: FilesService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    protected get dao(): TokenMetadataDao {
        return this.metadataDao;
    }

    async findMetadataByContractMetadataIdAndTokenIdentifier(
        contractMetadataId: string,
        tokenIdentifier: number
    ): Promise<ITokenMetadataDocument | null> {
        return this.dao.findMetadataByContractMetadataIdAndTokenIdentifier(
            contractMetadataId,
            tokenIdentifier
        );
    }

    async getNextTokenIdentifier(contractMetadataId: string): Promise<number | null> {
        return this.dao.getNextTokenIdentifier(contractMetadataId);
    }

    async storeMetadata(
        tokenCollectionId: string | null,
        userId: string,
        contractMetadataId: string,
        contractAddress: string | null,
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
        const tokenIdentifier = await this.getNextTokenIdentifier(contractMetadataId);

        if (!tokenIdentifier) {
            throw new MetadataError(Errors.CAN_NOT_GET_NEXT_TOKEN_IDENTIFIER);
        }

        return this.dao.storeMetadata(
            tokenCollectionId,
            userId,
            contractMetadataId,
            contractAddress,
            tokenIdentifier,
            name,
            image,
            animation,
            image_data,
            external_url,
            description,
            decimals,
            properties,
            attributes,
            background_color,
            youtube_url
        );
    }

    async getMetadataByContractAddressAndTokenIdentifiers(
        contractAddress: string,
        tokenIdentifiers: number[],
        lean = true
    ): Promise<Array<ITokenMetadataDocument | ITokenMetadataLeanDocument>> {
        return this.dao.getMetadataByContractAddressAndTokenIdentifiers(
            contractAddress,
            tokenIdentifiers,
            lean
        );
    }

    async storeTokenFiles(
        userId: string,
        contractSlug: string,
        imageFileKey: string,
        animationFileKey?: string
    ): Promise<IStoredTokenFiles> {
        const { bucketFrontend } = this.configService.get<IS3Config>('storage.s3');

        const imageBody = await this.storageService.readFile(imageFileKey, bucketFrontend);
        const { ext, mime: mimetype } = await getFileTypeFromBuffer(imageBody);

        imageFileFilter(
            null,
            { mimetype, originalname: `${imageFileKey}.${ext}` },
            (exception, status) => {
                if (!status && exception) {
                    throw new MetadataError(exception.message);
                }
            }
        );

        const s3Image = await this.storageService.save(
            TokenMetadataService.getTokenMetadataImagePath(userId, contractSlug, randomStringGenerator()),
            imageBody
        );
        if (!s3Image) {
            throw new MetadataError(Errors.CAN_NOT_STORE_IMAGE_METADATA);
        }

        let s3Animation;
        if (animationFileKey) {
            const animationBody = await this.storageService.readFile(animationFileKey, bucketFrontend);
            const { ext, mime: mimetype } = await getFileTypeFromBuffer(animationBody);

            animationFileFilter(
                null,
                { mimetype, originalname: `${animationFileKey}.${ext}` },
                (exception, status) => {
                    if (!status && exception) {
                        throw new MetadataError(exception.message);
                    }
                });

            s3Animation = await this.storageService.save(
                TokenMetadataService.getTokenMetadataAnimationPath(userId, contractSlug, randomStringGenerator()),
                animationBody
            );
            if (!s3Animation) {
                throw new MetadataError(Errors.CAN_NOT_STORE_ANIMATION_METADATA);
            }
        }

        return { s3Image, s3Animation };
    }

    async storeTokenFileFromUrl(
        userId: string,
        contractSlug: string,
        imageUrl: string
    ): Promise<IS3File> {
        const image = await this.filesService.storeFileFromUrl(
            imageUrl,
            TokenMetadataService.getTokenMetadataImagePath(userId, contractSlug, randomStringGenerator())
        );

        if (!image) {
            throw new MetadataError(CommonErrors.CAN_NOT_STORE_IMAGE);
        }

        let imageException = null;
        imageFileFilter(
            null,
            { mimetype: image.mimetype, originalname: image.location },
            (exception, status) => {
                if (!status && exception) {
                    imageException = exception;
                }
            }
        );

        if (imageException) {
            await this.storageService.remove(image);
            throw imageException;
        }

        return image;
    }

    private static getTokenMetadataImagePath(
        userId: string,
        contractSlug: string,
        key?: string
    ): string {
        const path = `metadata/${userId}/contracts/${contractSlug}/tokensUri/images`;

        if (!key) {
            return path;
        }

        return `${path}/${key}`;
    }

    private static getTokenMetadataAnimationPath(
        userId: string,
        contractSlug: string,
        key?: string
    ): string {
        const path = `metadata/${userId}/contracts/${contractSlug}/tokensUri/animations`;

        if (!key) {
            return path;
        }

        return `${path}/${key}`;
    }
}
