import { ApiProperty } from '@nestjs/swagger';
import { ToId } from '../../../decorators/to-id.decorator';
import { ToS3FilePublic } from '../../../decorators/to-s3-file-public.decorator';
import { ILaunchpadDocument } from '../../schemas/launchpad.schema';
import * as mongoose from 'mongoose';
import {IUserDocument} from '../../../users/schemas/user.schema';
import {ICardDocument} from '../../../cards/schemas/cards.schema';

//TODO: need check
export class TokenCollectionDto {
    @ApiProperty()
    @ToId()
    collectionId: mongoose.Schema.Types.ObjectId | IUserDocument | string;

    @ApiProperty()
    @ToId()
    dateStart: Date;

    @ApiProperty()
    dateEnd: Date;

    @ApiProperty()
    cards: mongoose.VirtualType | Array<ICardDocument>;

    @ApiProperty()
    @ToS3FilePublic()
    tiers: mongoose.VirtualType | Array<ICardDocument>;

    constructor (tokenCollection: ILaunchpadDocument) {
        this.collectionId = tokenCollection.collectionId;
        this.dateStart = tokenCollection.dateStart;
        this.dateEnd = tokenCollection.dateEnd;
        this.cards = tokenCollection.cards;
        this.tiers = tokenCollection.tiers;
    }
}