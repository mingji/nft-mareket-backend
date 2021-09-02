import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Param,
    Post,
    Put,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    NotFoundException,
    BadRequestException,
    Delete,
    Get,
    Query,
    HttpCode,
    HttpStatus,
    SerializeOptions,
    ForbiddenException
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiParam,
    ApiExtraModels,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse
} from '@nestjs/swagger';
import { CreateStoreFrontDto } from './dto/create-store-front.dto';
import { StoreFrontsService } from './store-fronts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StoreFrontDto } from './dto/store-front.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../utils/storage.service';
import { imageFileFilter } from '../utils/file-upload.utils';
import { StoreFrontAddCardsDto } from './dto/store-front-add-cards.dto';
import { CardsService } from '../cards/cards.service';
import { IStoreFrontDocument, IStoreFrontLeanDocument } from './schemas/store-fronts.schema';
import { StoreFrontDeleteCardsDto } from './dto/store-front-delete-cards.dto';
import { StoreFrontGetCardsQueryDto } from './dto/store-front-get-cards-query.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { CardBlockDto } from '../cards/dto/card-block.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ICardDocument } from '../cards/schemas/cards.schema';
import { StoreFrontGetCollectionsQueryDto } from './dto/store-front-get-collections-query.dto';
import { StoreFrontUpdateSettingsDto } from './dto/store-front-update-settings.dto';
import { Errors } from './types/errors';
import { StoreFrontPage } from './types/enums';
import { StoreFrontPageParamDto } from './dto/store-front-page-param.dto';
import { PageBlockSettingsPipe } from './pipes/page-block-settings.pipe';
import { StoreFrontPageBlockDto } from './dto/store-front-page-blocks-settings.dto';
import { StoreFrontPageDto } from './dto/store-front-page.dto';
import { StoreFrontSettingsMetaDto } from './dto/store-front-settings-meta.dto';
import { TokenCollectionDto } from '../tokenCollections/dto/response/token-collection-dto';
import { PublishStoreFrontDto } from './dto/publish-store-front.dto';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { JwtOptionalAuthGuard } from '../auth/guards/jwt-optional-auth.guard';
import { StoreFrontGetPageQueryDto } from './dto/store-front-get-page-query.dto';
import { UserTokenCollectionDto } from '../tokenCollections/dto/response/user-token-collection.dto';
import { IsSlugPipe } from '../pipes/is-slug.pipe';
import { IStoreFrontCollection } from './types/scheme';

@ApiTags('store-fronts')
@ApiExtraModels(PaginatedResponseDto, CardBlockDto, TokenCollectionDto)
@Controller('store-fronts')
export class StoreFrontsController {
    constructor(
        private readonly storeFrontsService: StoreFrontsService,
        private readonly storageService: StorageService,
        private readonly cardsService: CardsService
    ) {}

    @ApiCreatedResponse({ type: StoreFrontDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @UseInterceptors(FileInterceptor(
        'logo',
        { fileFilter: imageFileFilter })
    )
    @Post()
    async create(
        @Request() req,
        @UploadedFile() logo: Express.Multer.File,
        @Body() createStoreFrontDto: CreateStoreFrontDto
    ) {
        if (!logo) {
            throw new BadRequestException(Errors.LOGO_IS_REQUIRED);
        }

        const logoOnS3 = await this.storageService.upload(logo, req.user.id);
        const storeFront = await this.storeFrontsService.create(req.user.id, logoOnS3, createStoreFrontDto);
        await this.storeFrontsService.loadRelations(storeFront, ['owner']);

        return new StoreFrontDto(storeFront);
    }

    @ApiCreatedResponse({ type: StoreFrontDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Get(':id')
    async get(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument
    ) {
        if (storeFront.owner != req.user.id) {
            throw new NotFoundException();
        }

        await this.storeFrontsService.loadRelations(storeFront, ['owner']);

        return new StoreFrontDto(storeFront);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiForbiddenResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Put(':id/cards')
    async addCards(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Body() { cards: reqCards }: StoreFrontAddCardsDto
    ) {
        if (storeFront.owner != req.user.id) {
            throw new NotFoundException();
        }

        const cards = await this.cardsService.getCardsByIds(reqCards);
        if (!cards.length) {
            throw new BadRequestException();
        }

        const cardIds = cards.map(c => {
            if (!c.balances.map(b => b.userId.toString()).includes(req.user.id)) {
                throw new ForbiddenException();
            }
            return c._id.toString();
        });

        await this.storeFrontsService.addCards(storeFront.id, cardIds);
        await this.storeFrontsService.updateCollectionsByCards(storeFront.id, cardIds);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Delete(':id/cards')
    async deleteCards(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Body() storeFrontDeleteCardsDto: StoreFrontDeleteCardsDto
    ) {
        if (storeFront.owner != req.user.id) {
            throw new NotFoundException();
        }
        await this.storeFrontsService.deleteCards(storeFront.id, storeFrontDeleteCardsDto.cards);
        await this.storeFrontsService.updateCollectionsByCards(storeFront.id, storeFrontDeleteCardsDto.cards);
    }

    @ApiPaginatedResponse(CardBlockDto)
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @UseGuards(JwtOptionalAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Get(':id/cards')
    async getCards(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Query() query: StoreFrontGetCardsQueryDto
    ): Promise<PaginatedResponseDto<CardBlockDto, ICardDocument>> {
        if (query.release && !storeFront.release) {
            throw new NotFoundException();
        }

        if (!query.release && storeFront.owner.toString() !== req.user?.id) {
            throw new NotFoundException();
        }

        const data = await this.storeFrontsService.getCards(storeFront.id, query);

        return new PaginatedResponseDto<CardBlockDto, ICardDocument>(data, CardBlockDto);
    }

    @ApiPaginatedResponse(TokenCollectionDto)
    @ApiBadRequestResponse()
    @ApiNotFoundResponse()
    @UseGuards(JwtOptionalAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Get(':id/collections')
    async getCollections(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Query() query: StoreFrontGetCollectionsQueryDto
    ) {
        if (query.release && !storeFront.release) {
            throw new NotFoundException();
        }

        if (!query.release && storeFront.owner.toString() !== req.user?.id) {
            throw new NotFoundException();
        }

        const data = await this.storeFrontsService.getCollections(storeFront.id, query);

        return new PaginatedResponseDto<UserTokenCollectionDto, IStoreFrontCollection>(data, UserTokenCollectionDto);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @UseInterceptors(FileInterceptor(
        'logo',
        { fileFilter: imageFileFilter })
    )
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Put(':id/settings')
    async updateSettings(
        @Request() req,
        @UploadedFile() logo: Express.Multer.File,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Body() storeFrontUpdateSettingsDto: StoreFrontUpdateSettingsDto
    ) {
        if (storeFront.owner != req.user.id) {
            throw new NotFoundException();
        }

        if (await this.storeFrontsService.getBySlug(storeFrontUpdateSettingsDto.slug)) {
            throw new BadRequestException(Errors.STOREFRONT_WITH_SLUG_EXISTS);
        }

        let logoOnS3;
        if (logo) {
            logoOnS3 = await this.storageService.upload(logo, req.user.id);
        }

        await this.storeFrontsService.updateSettings(storeFront.id, logoOnS3, storeFrontUpdateSettingsDto);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiForbiddenResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @Put(':id/publish')
    async publishStoreFront(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Body() { slug }: PublishStoreFrontDto
    ): Promise<void> {
        if (storeFront.owner.toString() !== req.user.id) {
            throw new ForbiddenException();
        }

        if (!storeFront.slug && !slug) {
            throw new BadRequestException(Errors.SLUG_IS_REQUIRED);
        }

        if (await this.storeFrontsService.getBySlug(slug)) {
            throw new BadRequestException(Errors.STOREFRONT_WITH_SLUG_EXISTS);
        }

        if (!storeFront.pages.length) {
            throw new BadRequestException(Errors.STORE_FRONT_PAGES_EMPTY);
        }

        if (!storeFront.cards.length) {
            throw new BadRequestException(Errors.STORE_FRONT_CARDS_EMPTY);
        }

        if (!storeFront.collections.length) {
            throw new BadRequestException(Errors.STORE_FRONT_COLLECTIONS_EMPTY);
        }

        await this.storeFrontsService.publishStoreFront(storeFront, slug);
    }

    @ApiOkResponse({ type: StoreFrontDto })
    @ApiNotFoundResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('/releases/:slug')
    async getReleaseStoreFront(@Param('slug', IsSlugPipe) slug: string): Promise<StoreFrontDto> {
        const storeFront = await this.storeFrontsService.getBySlug(slug);

        if (!storeFront) {
            throw new NotFoundException();
        }

        if (!storeFront.release) {
            throw new NotFoundException();
        }

        return new StoreFrontDto(storeFront.release as Partial<IStoreFrontDocument>);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiParam({ name: 'page', type: 'string', enum: StoreFrontPage, required: true })
    @Put(':id/:page/settings')
    async updatePageSettings(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Param() page: StoreFrontPageParamDto,
        @Body(PageBlockSettingsPipe) storeFrontUpdatePageSettingsDto: StoreFrontPageBlockDto
    ) {
        if (storeFront.owner != req.user.id) {
            throw new NotFoundException();
        }

        await this.storeFrontsService.storePageSetting(storeFront, page, storeFrontUpdatePageSettingsDto);
    }

    @ApiBadRequestResponse()
    @ApiForbiddenResponse()
    @ApiNotFoundResponse()
    @ApiOkResponse({ type: StoreFrontPageDto })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtOptionalAuthGuard)
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiParam({ name: 'page', type: 'string', enum: StoreFrontPage, required: true })
    @Get(':id/:page')
    async getPageSettings(
        @Request() req,
        @Param('id', EntityByIdPipe(StoreFrontsService)) storeFront: IStoreFrontDocument,
        @Param() { page }: StoreFrontPageParamDto,
        @Query() { release }: StoreFrontGetPageQueryDto
    ) {
        if (release && !storeFront.release) {
            throw new NotFoundException();
        }

        if (!release && storeFront.owner.toString() !== req.user?.id) {
            throw new NotFoundException();
        }

        const storeFrontPage = this.storeFrontsService.getPageSettingByStoreFront(
            release ? storeFront.release as IStoreFrontLeanDocument : storeFront,
            page
        );

        if (!storeFrontPage) {
            throw new NotFoundException();
        }

        return new StoreFrontPageDto(storeFrontPage, storeFront.logo);
    }

    @ApiOkResponse({ type: StoreFrontSettingsMetaDto })
    @Get('pages/settings/meta')
    async getPageMeta(): Promise<StoreFrontSettingsMetaDto> {
        const settings = this.storeFrontsService.getPageSettingsMetadata();
        const pages = Object.values(StoreFrontPage);

        return new StoreFrontSettingsMetaDto(settings, pages);
    }
}
