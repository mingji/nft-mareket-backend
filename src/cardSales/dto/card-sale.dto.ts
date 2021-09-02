import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICardSaleLeanDocument } from '../schemas/card-sales.schema';
import { UserDto } from '../../users/dto/user.dto';
import { IUserDocument } from '../../users/schemas/user.schema';
import * as mongoose from 'mongoose';
import { ToId } from '../../decorators/to-id.decorator';
import { ObjectId } from 'mongoose';
import { SaleStatus } from '../types/enums';
import { OrderParsedDto } from './order-parsed.dto';

export class CardSaleDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    price: string;

    @ApiProperty()
    currency: string;

    @ApiProperty()
    priceUsd: number;

    @ApiProperty()
    tokensCount: number;

    @ApiProperty()
    publishFrom?: Date;

    @ApiProperty()
    publishTo?: Date;

    @ApiProperty()
    signature: string;

    @ApiProperty()
    saleContract: string;

    @ApiProperty()
    order: any[];

    @ApiProperty({ type: OrderParsedDto })
    orderParsed: OrderParsedDto;

    @ApiProperty()
    orderHash: string;

    @ApiProperty({ enum: SaleStatus })
    status: SaleStatus;

    @ApiPropertyOptional({ type: UserDto })
    user?: UserDto;

    @ApiPropertyOptional()
    @ToId()
    userId?: ObjectId;

    constructor(sale: Partial<ICardSaleLeanDocument>) {
        const user = sale.user;
        this.id = sale.id;
        this.price = sale.bnPrice?.toFixed() || sale.price?.toString() || '0';
        this.currency = sale.currency.symbol;
        this.priceUsd = sale.priceUsd ?? 0;
        this.publishFrom = sale.publishFrom;
        this.publishTo = sale.publishTo;
        this.tokensCount = sale.tokensCount;
        this.signature = sale.signature;
        this.saleContract = sale.saleContract;
        this.order = sale.order;
        this.orderHash = sale.orderHash;
        this.status = sale.status;
        this.orderParsed = new OrderParsedDto(sale.orderParsed);
        if (user instanceof mongoose.Types.ObjectId) {
            this.userId = user as ObjectId;
        } else {
            this.user = user ? new UserDto(user as IUserDocument) : undefined;
        }
    }
}