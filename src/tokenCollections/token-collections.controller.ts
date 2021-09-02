import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Request,
    SerializeOptions,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { TokenCollectionsService } from './token-collections.service';
import { IUserDocument } from '../users/schemas/user.schema';
import {
    ApiBadRequestResponse,
    ApiConsumes,
    ApiExtraModels,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ITokenCollectionDocument } from './schemas/token-collection.schema';
import { TokenCollectionDto } from './dto/response/token-collection-dto';
import { GetCollectionListDto } from './dto/request/get-collection-list-dto';
import { UserTokenCollectionDto } from './dto/response/user-token-collection.dto';
import { GetUserCollectionsDto } from './dto/request/get-user-collections.dto';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { UsersService } from '../users/users.service';
import { ICollection } from './types/scheme';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContractMetadataService } from '../metadata/services';
import { UpdateTokenCollectionDto } from './dto/request/update-token-collection.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '../utils/file-upload.utils';
import { ApiImplicitFile } from '@nestjs/swagger/dist/decorators/api-implicit-file.decorator';
import { StorageService } from '../utils/storage.service';
import { MailService } from '../mailer/mail.service';
import { ReportMessageDto } from '../dto/report.dto';
import { IHtmlData } from '../mailer/types/scheme';
import { getMailSubject, Subjects } from '../config';

@ApiTags('Token collections')
@ApiExtraModels(PaginatedResponseDto, UserTokenCollectionDto, TokenCollectionDto)
@Controller()
export class TokenCollectionsController {
    constructor(
        private readonly tokenCollectionsService: TokenCollectionsService,
        private readonly contractMetadataService: ContractMetadataService,
        private readonly storageService: StorageService,
        private readonly mailService: MailService
    ) {}

    @ApiPaginatedResponse(UserTokenCollectionDto)
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('users/:userId/collections')
    async getUserCollections(
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Query() query: GetUserCollectionsDto
    ): Promise<PaginatedResponseDto<UserTokenCollectionDto, ITokenCollectionDocument>> {
        const data = await this.tokenCollectionsService.getUserCollections(user.id, query);

        return new PaginatedResponseDto<UserTokenCollectionDto, ICollection>(
            data,
            UserTokenCollectionDto
        );
    }

    @ApiPaginatedResponse(TokenCollectionDto)
    @ApiBadRequestResponse()
    @ApiOperation({ summary: 'Get collections list by filter' })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('/users/collections/list')
    async getCollectionsListByFilter(
        @Query() query: GetCollectionListDto
    ): Promise<PaginatedResponseDto<TokenCollectionDto, ITokenCollectionDocument>> {
        const data = await this.tokenCollectionsService.getCollectionsListByFilter(query);
        return new PaginatedResponseDto<TokenCollectionDto, ITokenCollectionDocument>(data, TokenCollectionDto);
    }

    @ApiOkResponse({ type: TokenCollectionDto })
    @ApiNotFoundResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('/users/collections/:tokenCollectionId')
    async getCollection(
        @Param(
            'tokenCollectionId',
            EntityByIdPipe(TokenCollectionsService)
        ) tokenCollection: ITokenCollectionDocument,
    ): Promise<TokenCollectionDto> {
        return new TokenCollectionDto(tokenCollection);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiParam({ name: 'tokenCollectionId', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtAuthGuard)
    @ApiConsumes('multipart/form-data')
    @ApiImplicitFile({ name: 'logo', required: false })
    @UseInterceptors(FileInterceptor('logo', { fileFilter: imageFileFilter }))
    @Put('users/collections/:tokenCollectionId')
    async updateCollection(
        @Request() req,
        @UploadedFile() logo: Express.Multer.File,
        @Param(
            'tokenCollectionId',
            EntityByIdPipe(TokenCollectionsService)
        ) tokenCollection: ITokenCollectionDocument,
        @Body() data: UpdateTokenCollectionDto
    ): Promise<void> {
        const contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(
            req.user.id,
            tokenCollection.slug
        );
        if (!contractMetadata) {
            throw new NotFoundException();
        }

        let logoOnS3;
        if (logo) {
            logoOnS3 = await this.contractMetadataService.storeLogo(req.user.id, tokenCollection.slug, logo);
        }

        if (logoOnS3 && tokenCollection.logo) {
            await this.storageService.remove(tokenCollection.logo);
        }

        await this.tokenCollectionsService.updateCollectionBySlug(tokenCollection.slug, data, logoOnS3);
    }

    @ApiOkResponse()
    @ApiBadRequestResponse()
    @UseGuards(JwtAuthGuard)
    @Post('users/collections/:tokenCollectionId/report')
    async reportTokenCollection(
        @Request() req,
        @Body() body: ReportMessageDto,
        @Param('tokenCollectionId') tokenCollectionId: string,
    ): Promise<void> {
        const subject = getMailSubject(Subjects.tokenCollection, tokenCollectionId);
        const htmlData: IHtmlData = { walletAddress: req.user.walletAddress, message: body.message, link: body.link };
        await this.mailService.sendMail(body.email, subject, htmlData)
    }
}
