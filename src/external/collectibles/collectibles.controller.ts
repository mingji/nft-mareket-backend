import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Request,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { CollectiblesService } from './collectibles.service';
import { Errors } from '../../metadata/types/errors';
import { Errors as CollectibleErrors } from '../collectibles/types/errors';
import { ExternalClientAuthGuard } from '../../auth/guards/external-client-auth.guard';
import { ContractMetadataService, TokenMetadataService } from '../../metadata/services';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from '../../config';
import { StoreCollectibleDto } from './dto/request/store-collectible.dto';
import { ClientsService } from '../clients/clients.service';
import { CollectibleDto } from './dto/response/collectible.dto';
import { EntityByIdPipe } from '../../pipes/entity-by-id.pipe';
import { ICollectibleDocument } from './schemas/collectible.schema';
import { getAddressFromPrivateKey } from '../../helpers/blockchain';

@ApiTags('External collectibles')
@Controller('external/collectibles')
export class CollectiblesController {
    constructor(
        private readonly collectiblesService: CollectiblesService,
        private readonly contractMetadataService: ContractMetadataService,
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
        private readonly tokenMetadataService: TokenMetadataService,
        private readonly clientsService: ClientsService,
    ) {}

    @ApiOkResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(ExternalClientAuthGuard)
    @Post('')
    async storeCollectible(
        @Request() req,
        @Body() {
            externalCollectibleId,
            externalStoreId,
            externalCreatorEmail,
            externalCreatorId,
            maxSupply,
            metadata: { name, image, decimals, description, properties }
        }: StoreCollectibleDto
    ): Promise<CollectibleDto> {
        if (await this.collectiblesService.existsCollectible(req.user.id, externalCollectibleId)) {
            throw new BadRequestException(CollectibleErrors.COLLECTIBLE_EXISTS);
        }

        const contractSlug = this.clientsService.getSlugByClient(req.user);

        const { marketPlacePrivateKey } = this.configService.get<IBlockchainConfig>('blockchain');
        const marketPlaceUser = await this.usersService.findOrCreateUserByEthAddress(
            getAddressFromPrivateKey(marketPlacePrivateKey)
        );

        let contractMetadata = await this.contractMetadataService.findMetadataByUserIdAndSlug(
            marketPlaceUser.id,
            contractSlug
        );
        if (!contractMetadata) {
            if (await this.contractMetadataService.existsMetadataBySlug(contractSlug)) {
                throw new BadRequestException(Errors.METADATA_EXISTS);
            }

            contractMetadata = await this.contractMetadataService.storeMetadata(
                marketPlaceUser.id,
                { slug: contractSlug, name: req.user.name }
            );
        }

        const s3Image = await this.tokenMetadataService.storeTokenFileFromUrl(
            marketPlaceUser.id,
            contractMetadata.slug,
            image
        );

        const tokenMetadata = await this.tokenMetadataService.storeMetadata(
            null,
            marketPlaceUser.id,
            contractMetadata.id,
            null,
            name,
            s3Image,
            null,
            null,
            null,
            description,
            decimals,
            properties
        );

        const { id } = await this.collectiblesService.storeCollectible(
            req.user.id,
            tokenMetadata.id,
            maxSupply,
            externalCollectibleId,
            externalCreatorId,
            externalCreatorEmail,
            externalStoreId
        );

        return new CollectibleDto({ id });
    }

    @ApiOkResponse()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(ExternalClientAuthGuard)
    @Get(':collectibleId')
    async getCollectible(
        @Request() req,
        @Param('collectibleId', EntityByIdPipe(CollectiblesService)) collectible: ICollectibleDocument
    ): Promise<CollectibleDto> {
        if (collectible.clientId.toString() !== req.user.id) {
            throw new NotFoundException();
        }

        await this.collectiblesService.loadRelations(collectible, ['tokenMetadataId']);

        return new CollectibleDto(collectible);
    }
}
