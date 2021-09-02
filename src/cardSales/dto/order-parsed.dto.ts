import { ISaleOrder } from '../schemas/card-sales.schema';
import { ApiProperty } from '@nestjs/swagger';
import { FeeMethod, HowToCall, SaleKind, Side } from '../../blockchain/types/wyvern-exchange/enums';

export class OrderParsedDto {
    @ApiProperty({ type: [String] })
    addrs: string[];

    @ApiProperty({ type: [String] })
    uints: string[];

    @ApiProperty({ enum: FeeMethod })
    feeMethod: FeeMethod;

    @ApiProperty({ enum: Side })
    side: Side;

    @ApiProperty({ enum: SaleKind })
    saleKind: SaleKind;

    @ApiProperty({ enum: HowToCall })
    howToCall: HowToCall;

    @ApiProperty()
    calldata: string;

    @ApiProperty()
    replacementPattern: string;

    @ApiProperty()
    staticExtradata: string;

    constructor(order: ISaleOrder) {
        this.addrs = order.addrs;
        this.uints = order.uints;
        this.feeMethod = order.feeMethod;
        this.side = order.side;
        this.saleKind = order.saleKind;
        this.howToCall = order.howToCall;
        this.calldata = order.calldata;
        this.replacementPattern = order.replacementPattern;
        this.staticExtradata = order.staticExtradata;
    }
}
