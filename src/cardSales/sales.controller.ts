import {
    ClassSerializerInterceptor,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Request,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ICardSaleDocument } from './schemas/card-sales.schema';
import { CardSalesService } from './card-sales.service';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { CardsService } from '../cards/cards.service';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
    constructor(
        private readonly cardSalesService: CardSalesService,
        private readonly cardsService: CardsService
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Delete(':saleId')
    async delete(
        @Request() req,
        @Param('saleId', EntityByIdPipe(CardSalesService)) sale: ICardSaleDocument
    ): Promise<void> {
        if (req.user.id != sale.userId) {
            throw new NotFoundException();
        }
        await this.cardSalesService.deleteSaleById(sale.id);
        await this.cardsService.processHasSale(sale.cardId.toString());
    }
}
