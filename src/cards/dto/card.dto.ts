import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IBalanceCard, ICardDocument, IFilePublicCard, IPropertyCard } from '../schemas/cards.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { ICardSaleDocument } from '../../cardSales/schemas/card-sales.schema';
import { UserDto } from '../../users/dto/user.dto';
import { CardSaleDto } from '../../cardSales/dto/card-sale.dto';
import { ToId } from '../../decorators/to-id.decorator';
import { BalanceDto } from './balance.dto';
import { ChainInfoDto, FileCardDto, PropertyDto } from './common';
import { ICardListings } from '../../types/scheme';
import { EIP } from '../../config/types/constants';
import { TokenCollectionShortDto } from '../../tokenCollections/dto/response/token-collection-short.dto';

interface CardDtoOptions { balance?: Partial<IBalanceCard>, sale?: ICardSaleDocument, authUserId?: string }

export class CardDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ enum: EIP })
    eipVersion: EIP;

    @ApiProperty({ type: FileCardDto })
    file: FileCardDto;

    @ApiProperty({ type: UserDto })
    creator: UserDto;

    @ApiProperty({ type: TokenCollectionShortDto })
    tokenCollection: TokenCollectionShortDto;

    @ApiProperty()
    description: string;

    @ApiProperty({ type: [PropertyDto] })
    @Transform((props) => props.value.map((prop: IPropertyCard) => new PropertyDto(prop)))
    properties: PropertyDto[];

    @ApiProperty({ type: ChainInfoDto })
    chainInfo: ChainInfoDto;

    @ApiProperty()
    isPrivate: boolean;

    @ApiProperty()
    totalSupply: number;

    @ApiProperty({ type: [BalanceDto] })
    balances: BalanceDto[];

    @ApiProperty({ type: [CardSaleDto] })
    sales: CardSaleDto[];

    @ApiProperty()
    likesAmount: number;

    @ApiProperty()
    dislikesAmount: number;

    @ApiPropertyOptional()
    isLiked?: boolean;

    @ApiPropertyOptional({ type: BalanceDto, description: 'Exist if :cardId/users/:userId' })
    balance?: BalanceDto;

    @ApiPropertyOptional({ type: CardSaleDto, description: 'Exist if :cardId/users/:userId/sales/:saleId' })
    sale?: CardSaleDto;

    constructor(card: ICardDocument, listings: ICardListings | null, options: CardDtoOptions = {}) {
        const { balance, sale, authUserId } = options;
        const tokenCollection = card.tokenCollection as ITokenCollectionDocument

        this.id = card.id;
        this.eipVersion = card.eipVersion;
        this.name = card.name;
        this.balance = balance ? new BalanceDto(balance) : undefined;
        this.sale = sale ? new CardSaleDto(sale) : undefined;
        this.file = card.filePublic as IFilePublicCard;
        this.creator = new UserDto(card.creator as IUserDocument);
        this.tokenCollection = new TokenCollectionShortDto(tokenCollection);
        this.description = card.description;
        this.properties = card.properties;
        this.sales = listings ? listings.cardSales.map(sale => new CardSaleDto(sale)) : null;
        this.balances = listings ? listings.cardBalances.map(balance => new BalanceDto(balance)) : null;
        this.isPrivate = card.isPrivate;
        this.totalSupply = card.totalSupply;
        this.chainInfo = new ChainInfoDto(tokenCollection, card);
        this.likesAmount = card.likes.length;
        this.dislikesAmount = card.dislikes.length;
        if (authUserId) {
            this.isLiked = card.likes.findIndex(like => like.toString() === authUserId) > -1;
        }
    }
}
