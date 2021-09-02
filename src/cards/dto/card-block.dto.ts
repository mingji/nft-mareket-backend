import { S3FilePublicDto } from '../../dto/s3-file-public.dto';
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto';
import { CardSaleDto } from '../../cardSales/dto/card-sale.dto';
import { ICardDocument } from '../schemas/cards.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ToId } from '../../decorators/to-id.decorator';
import { ToS3FilePublic } from '../../decorators/to-s3-file-public.decorator';
import { ObjectId } from 'mongoose';
import { ICardSaleDocument } from '../../cardSales/schemas/card-sales.schema';
import { IS3File } from '../../types/scheme';
import { BalanceDto } from './balance.dto';
import { TokenCollectionShortDto } from '../../tokenCollections/dto/response/token-collection-short.dto';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { ChainInfoDto } from './common';

export class CardBlockDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ type: S3FilePublicDto })
    @ToS3FilePublic()
    image: S3FilePublicDto;

    @ApiProperty()
    tokenCollection: TokenCollectionShortDto;

    @ApiProperty({ type: UserDto })
    creator: UserDto;

    @ApiProperty()
    @ToId()
    categoryId: ObjectId;

    @ApiProperty()
    totalSupply: number;

    @ApiProperty({ type: [CardSaleDto] })
    sales: CardSaleDto[];

    @ApiProperty({ type: ChainInfoDto })
    chainInfo: ChainInfoDto;

    @ApiProperty({ type: [BalanceDto] })
    balance?: BalanceDto;

    @ApiProperty()
    isLiked?: boolean;

    constructor(card: Partial<ICardDocument>, userId?: string, authUserId?: string) {
        const sales = card.sales as ICardSaleDocument[];
        const tokenCollection = card.tokenCollectionId as ITokenCollectionDocument;
        this.id = card.id;
        this.name = card.name;
        this.image = (card.preview ?? card.file.original) as IS3File;
        this.tokenCollection = new TokenCollectionShortDto(card.tokenCollectionId as ITokenCollectionDocument);
        this.categoryId = card.categoryId as ObjectId;
        this.totalSupply = card.totalSupply;
        this.creator = new UserDto(card.creator as IUserDocument);
        this.chainInfo = new ChainInfoDto(tokenCollection, card);
        this.sales = sales ? sales.map(sale => new CardSaleDto(sale)) : undefined;
        if (userId) {
            this.balance = new BalanceDto(card.balances.find(b => b.userId.toString() === userId.toString()));
        }
        if (authUserId) {
            this.isLiked = card.likes.findIndex(like => like.toString() === authUserId) > -1;
        }
    }
}
