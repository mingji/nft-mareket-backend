import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Request,
    SerializeOptions,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '../utils/file-upload.utils';
import { ApiImplicitFile } from '@nestjs/swagger/dist/decorators/api-implicit-file.decorator';
import { Errors } from './types/errors';
import { StorageService } from '../utils/storage.service';
import { StoreContractMetadataDto } from './dto/request/store-contract-metadata.dto';
import { ContractMetadataDto } from './dto/response/contract-metadata.dto';
import { IUserDocument } from '../users/schemas/user.schema';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { UsersService } from '../users/users.service';
import { TokenCollectionsService } from '../tokenCollections/token-collections.service';
import { ITokenCollectionDocument } from '../tokenCollections/schemas/token-collection.schema';
import { ContractMetadataService, TokenMetadataService } from './services';
import { ContractMetadataUriDto } from './dto/response/contract-metadata-uri.dto';
import { TokenMetadataUriDto } from './dto/response/token-metadata-uri.dto';
import { StoreTokenMetadataDto } from './dto/request/store-token-metadata.dto';
import { TokenMetadataDto } from './dto/response/token-metadata.dto';
import { IsSlugPipe } from '../pipes/is-slug.pipe';
import { SignedUrlsQueryDto } from './dto/request/signed-urls-query.dto';
import { MetadataFiles } from './types/enums';
import { FilesSignedUrlsDto } from '../users/dto/files-signed-urls.dto';

@ApiTags('Metadata')
@Controller('metadata')
export class MetadataController {
    constructor(
        private readonly storageService: StorageService,
        private readonly tokenMetadataService: TokenMetadataService,
        private readonly contractMetadataService: ContractMetadataService,
        private readonly usersService: UsersService
    ) {}

    @ApiOkResponse({ type: ContractMetadataUriDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(JwtAuthGuard)
    @ApiImplicitFile({ name: 'logo', required: false })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('logo', { fileFilter: imageFileFilter }))
    @Post('collections')
    async storeContractMetadata(
        @Request() req,
        @UploadedFile() logo: Express.Multer.File,
        @Body() data: StoreContractMetadataDto
    ): Promise<ContractMetadataUriDto> {
        const { slug } = data;

        if (await this.contractMetadataService.existsMetadataBySlug(slug)) {
            throw new BadRequestException(Errors.METADATA_EXISTS);
        }

        let logoOnS3;
        if (logo) {
            logoOnS3 = await this.contractMetadataService.storeLogo(req.user.id, slug, logo);
        }

        const contractMetadata = await this.contractMetadataService.storeMetadata(req.user.id, data, logoOnS3);

        return new ContractMetadataUriDto(contractMetadata);
    }

    @ApiOkResponse({ type: ContractMetadataDto })
    @ApiNotFoundResponse()
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @ApiParam({ name: 'slug', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('users/:userId/collections/:slug')
    async getContractMetadata(
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Param('slug', IsSlugPipe) slug: string
    ): Promise<ContractMetadataDto> {
        const contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(user.id, slug);
        if (!contractMetadata) {
            throw new NotFoundException();
        }

        return new ContractMetadataDto(contractMetadata);
    }

    @ApiOkResponse({ type: ContractMetadataUriDto })
    @ApiNotFoundResponse()
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @ApiParam({ name: 'slug', type: 'string', required: true })
    @Get('users/:userId/collections/:slug/uri')
    async getContractMetadataUri(
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Param('slug', IsSlugPipe) slug: string
    ): Promise<ContractMetadataUriDto> {
        const contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(user.id, slug);
        if (!contractMetadata) {
            throw new NotFoundException();
        }

        return new ContractMetadataUriDto(contractMetadata);
    }

    @ApiOkResponse()
    @ApiUnauthorizedResponse()
    @ApiBadRequestResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtAuthGuard)
    @Get('signed-urls')
    async getSignedUrls(
        @Request() req,
        @Query() { type }: SignedUrlsQueryDto
    ): Promise<FilesSignedUrlsDto> {
        const data = this.usersService.getSignedUrls(
            req.user.id,
            MetadataFiles[type]
        );

        return new FilesSignedUrlsDto(data);
    }

    @ApiOkResponse({ type: TokenMetadataUriDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(JwtAuthGuard)
    @Post('collections/:tokenCollectionId/cards')
    async storeTokenMetadata(
        @Request() req,
        @Body() {
            name,
            description,
            imageKey,
            attributes,
            background_color,
            youtube_url,
            animationKey,
            external_url,
            image_data
        }: StoreTokenMetadataDto,
        @Param(
            'tokenCollectionId',
            EntityByIdPipe(TokenCollectionsService)
        ) tokenCollection: ITokenCollectionDocument
    ): Promise<TokenMetadataUriDto> {
        if (tokenCollection.userId.toString() !== req.user.id) {
            throw new NotFoundException();
        }

        const contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(
            tokenCollection.userId as string,
            tokenCollection.slug
        );
        if (!contractMetadata) {
            throw new NotFoundException();
        }

        const { s3Image, s3Animation } = await this.tokenMetadataService.storeTokenFiles(
            req.user.id,
            contractMetadata.slug,
            imageKey,
            animationKey
        );

        const metadata = await this.tokenMetadataService.storeMetadata(
            tokenCollection.id,
            req.user.id,
            contractMetadata.id,
            tokenCollection.contractId,
            name,
            s3Image,
            s3Animation,
            image_data,
            external_url,
            description,
            null,
            null,
            attributes,
            background_color,
            youtube_url
        );

        return new TokenMetadataUriDto(contractMetadata, metadata.token_identifier);
    }

    @ApiOkResponse({ type: TokenMetadataDto })
    @ApiNotFoundResponse()
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @ApiParam({ name: 'slug', type: 'string', required: true })
    @ApiParam({ name: 'tokenIdentifier', type: 'number', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('users/:userId/collections/:slug/:tokenIdentifier')
    async getTokenMetadata(
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Param('slug', IsSlugPipe) slug: string,
        @Param('tokenIdentifier', ParseIntPipe) tokenIdentifier: number
    ): Promise<TokenMetadataDto> {
        const contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(user.id, slug);
        if (!contractMetadata) {
            throw new NotFoundException();
        }

        const metadata = await this.tokenMetadataService.findMetadataByContractMetadataIdAndTokenIdentifier(
            contractMetadata.id,
            tokenIdentifier
        );
        if (!metadata) {
            throw new NotFoundException();
        }

        return new TokenMetadataDto(metadata);
    }
}
