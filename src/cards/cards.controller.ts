import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Request,
    SerializeOptions,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ICardDocument } from './schemas/cards.schema';
import { CardsService } from './cards.service';
import {
    ApiBadRequestResponse,
    ApiExtraModels,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags
} from '@nestjs/swagger';
import { CardDto } from './dto/card.dto';
import { CardsQueryDto } from './dto/cards-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { CardBlockDto } from './dto/card-block.dto';
import { IUserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mailer/mail.service';
import { CardSalesService } from '../cardSales/card-sales.service';
import { ICardSaleDocument } from '../cardSales/schemas/card-sales.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalAuthGuard } from '../auth/guards/jwt-optional-auth.guard';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { UsersService } from '../users/users.service';
import { ReportMessageDto } from '../dto/report.dto';
import { IHtmlData } from '../mailer/types/scheme';
import { getMailSubject, Subjects } from '../config';

@ApiTags('Cards')
@ApiExtraModels(PaginatedResponseDto, CardBlockDto)
@Controller('cards')
export class CardsController {
    constructor(
        private readonly cardsService: CardsService,
        private readonly cardSalesService: CardSalesService,
        private readonly mailService: MailService
    ) {}

    @ApiOkResponse()
    @ApiBadRequestResponse()
    @UseGuards(JwtAuthGuard)
    @Post(':cardId/report')
    async reportCard(
        @Request() req,
        @Body() body: ReportMessageDto,
        @Param('cardId') cardId: string,
    ): Promise<void> {
        const subject = getMailSubject(Subjects.card, cardId);
        const htmlData: IHtmlData = { walletAddress: req.user.walletAddress, message: body.message, link: body.link };
        await this.mailService.sendMail(body.email, subject, htmlData)
    }

    @ApiOkResponse({ type: CardDto })
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @ApiParam({ name: 'cardId', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':cardId')
    async getCard(
        @Request() req,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument
    ): Promise<CardDto> {
        if (req.user) {
            await this.cardsService.processViewersCount(card.id, req.user.id);
        }

        await this.cardsService.loadRelations(card, ['creator', 'tokenCollectionId']);
        const cardListings = await this.cardsService.getListingsByCard(card);

        return new CardDto(card, cardListings, { authUserId: req.user?.id });
    }

    @ApiOkResponse({ type: CardDto })
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @ApiParam({ name: 'cardId', type: 'string', required: true })
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':cardId/users/:userId')
    async getUserCard(
        @Request() req,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument,
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument
    ): Promise<CardDto> {
        if (req.user) {
            await this.cardsService.processViewersCount(card.id, req.user.id);
        }

        const balance = await this.cardsService.findBalanceByUserId(card, user.id);

        if (!balance) {
            throw new NotFoundException();
        }

        await this.cardsService.loadRelations(card, ['creator', 'tokenCollectionId']);
        const cardListings = await this.cardsService.getListingsByCard(card);

        return new CardDto(card, cardListings, { balance, authUserId: req.user?.id });
    }

    @ApiOkResponse({ type: CardDto })
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @ApiParam({ name: 'cardId', type: 'string', required: true })
    @ApiParam({ name: 'userId', type: 'string', required: true })
    @ApiParam({ name: 'saleId', type: 'string', required: true })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':cardId/users/:userId/sales/:saleId')
    async getCardSale(
        @Request() req,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument,
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Param('saleId', EntityByIdPipe(CardSalesService)) sale: ICardSaleDocument
    ): Promise<CardDto> {
        if (req.user) {
            await this.cardsService.processViewersCount(card.id, req.user.id);
        }

        if (user.id !== sale.userId.toString()) {
            throw new NotFoundException();
        }

        await this.cardsService.loadRelations(card, ['creator', 'tokenCollectionId']);
        await this.cardSalesService.loadRelations(sale, ['userId']);

        const cardListings = await this.cardsService.getListingsByCard(card);

        return new CardDto(card, cardListings, { sale });
    }

    @ApiPaginatedResponse(CardBlockDto)
    @ApiBadRequestResponse()
    @UseGuards(JwtOptionalAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('')
    async list(
        @Request() req,
        @Query()
        {
            collections,
            sale,
            categories,
            limit,
            offset,
            sortField,
            sortOrder,
            userId,
            createdBy,
            propertyName,
            propertyValue,
            search,
            likedBy
        }: CardsQueryDto
    ): Promise<PaginatedResponseDto<CardBlockDto, ICardDocument>> {
        const data = await this.cardsService.getCardsList(
            {
                collections,
                sale,
                categories,
                limit,
                offset,
                sortField,
                createdBy,
                sortOrder,
                search,
                likedBy,
                property: { property: propertyName, value: propertyValue }
            },
            userId
        );

        return new PaginatedResponseDto<CardBlockDto, ICardDocument>(data, CardBlockDto, userId, req.user && req.user.id);
    }

    @ApiNoContentResponse()
    @ApiNotFoundResponse()
    @ApiParam({ name: 'cardId', type: 'string', required: true })
    @UseGuards(JwtAuthGuard)
    @Put(':cardId/like')
    async like(
        @Request() req,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument
    ): Promise<void> {
        await this.cardsService.likeCard(req.user.id, card.id);
    }

    @ApiNoContentResponse()
    @ApiNotFoundResponse()
    @ApiParam({ name: 'cardId', type: 'string', required: true })
    @UseGuards(JwtAuthGuard)
    @Put(':cardId/dislike')
    async dislike(
        @Request() req,
        @Param('cardId', EntityByIdPipe(CardsService)) card: ICardDocument
    ): Promise<void> {
        await this.cardsService.dislikeCard(req.user.id, card.id);
    }
}
