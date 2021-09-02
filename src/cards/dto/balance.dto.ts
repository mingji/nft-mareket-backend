import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto';
import { IBalanceCard } from '../schemas/cards.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ToId } from '../../decorators/to-id.decorator';
import * as mongoose from 'mongoose';
import { ObjectId } from 'mongoose';

export class BalanceDto {
    @ApiProperty()
    @ToId()
    balanceId: string;

    @ApiProperty()
    tokenAmount: number;

    @ApiProperty()
    ethAddress: string;

    @ApiPropertyOptional({ type: UserDto })
    user?: UserDto;

    @ApiPropertyOptional()
    @ToId()
    userId?: ObjectId;

    constructor(balance: Partial<IBalanceCard>) {
        this.balanceId = balance.balanceId;
        this.tokenAmount = balance.tokenAmount;
        this.ethAddress = balance.ethAddress;
        this.user = new UserDto(balance.user as IUserDocument);
        const user = balance.user;
        if (user instanceof mongoose.Types.ObjectId) {
            this.userId = user as ObjectId;
        } else {
            this.user = user ? new UserDto(user as IUserDocument) : undefined;
        }
    }
}
