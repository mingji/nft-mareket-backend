import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ICardDocument } from '../cards/schemas/cards.schema';
import { CardsService } from '../cards/cards.service';
import { Errors } from '../types/errors';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CardSalesService } from './card-sales.service';
import { TokenCollectionsService } from '../tokenCollections/token-collections.service';
import { ITokenCollectionDocument } from '../tokenCollections/schemas/token-collection.schema';
import { SignTypeDataService } from '../signTypeData/sign-type-data.service';
import { SignCreateSaleDto } from '../signTypeData/dto/sign-create-sale.dto';
import { CryptocurrenciesService } from '../cryptocurrencies/cryptocurrencies.service';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CryptocurrencyError } from '../cryptocurrencies/errors/cryptocurrency.error';

@ApiTags('Card sales')
@Controller()
export class CardSalesController {
    constructor(
        private readonly cardsService: CardsService,
        private readonly cardSalesService: CardSalesService,
        private readonly tokenCollectionsService: TokenCollectionsService,
        private readonly blockchainService: BlockchainService,
        private readonly signTypeDataService: SignTypeDataService,
        private readonly cryptocurrenciesService: CryptocurrenciesService
    ) {}

    @ApiOkResponse({ type: SignCreateSaleDto })
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Get('cards/sales/signature')
    async saleSignature(): Promise<Partial<SignCreateSaleDto>> {
        return new SignCreateSaleDto(this.cardSalesService.getSaleSignature());
    }

    @ApiCreatedResponse()
    @ApiNotFoundResponse()
    @ApiUnauthorizedResponse()
    @ApiBadRequestResponse()
    @ApiForbiddenResponse()
    @UseGuards(JwtAuthGuard)
    @Post('cards/:cardId/sales')
    async createSale(
        @Request() req,
        @Body() { signature, data }: CreateSaleDto,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument
    ): Promise<void> {
        const balance = await this.cardsService.findBalanceByUserId(card, req.user.id, false);
        if (!balance) {
            throw new ForbiddenException();
        }

        if (data.tokensCount > balance.tokenAmount) {
            throw new BadRequestException(Errors.NOT_ENOUGH_TOKENS_BALANCE);
        }

        await this.cardsService.loadRelations(card, ['tokenCollectionId']);
        const tokenCollection = card.tokenCollection as ITokenCollectionDocument;

        if (!await this.cryptocurrenciesService.isAllowedCurrency(tokenCollection.blockchain, data.currency)) {
            throw new CryptocurrencyError(Errors.WRONG_CURRENCY);
        }

        const cryptocurrency = await this.tokenCollectionsService.getContractCryptocurrencyBySymbol(
            tokenCollection,
            data.currency
        );
        if (!cryptocurrency) {
            throw new BadRequestException(Errors.WRONG_CURRENCY);
        }

        const { saleContract, marketPlaceFeeAddress } = tokenCollection.saleContract;

        const { order, orderHash } = await this.blockchainService.getCardPutOnSaleHash(
            tokenCollection.blockchain,
            saleContract,
            marketPlaceFeeAddress,
            card.eipVersion,
            req.user.ethAddress,
            tokenCollection.contractId,
            card.identifier,
            data.tokensCount,
            data.price,
            data.publishFrom,
            data.publishTo,
            data.salt,
            cryptocurrency.tokenAddress,
            data.staticExtraData
        );

        if (!this.signTypeDataService.checkUserSignatureByEthSign(orderHash, signature, req.user.ethAddress)) {
            throw new BadRequestException();
        }

        await this.cardSalesService.createSale(
            tokenCollection.blockchain,
            card.id,
            req.user.id,
            data.tokensCount,
            data.price,
            data.currency,
            signature,
            order,
            orderHash,
            saleContract,
            data.publishFrom,
            data.publishTo
        );
    }
}
