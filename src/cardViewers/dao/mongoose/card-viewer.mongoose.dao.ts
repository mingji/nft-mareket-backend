import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { CardViewerDao } from '../card-viewer.dao';
import { ICardViewerDocument } from '../../schemas/card-viewers.schema';

@Injectable()
export class CardViewerMongooseDao extends DaoMongoose implements CardViewerDao {
    @InjectModel(DaoModelNames.cardViewer) private readonly cardViewerModel: Model<ICardViewerDocument>;

    protected get model(): Model<ICardViewerDocument> {
        return this.cardViewerModel;
    }

    async existViewer(cardId: string, userId: string): Promise<boolean> {
        return this.cardViewerModel.exists({ cardId, userId });
    }

    async storeViewer(cardId: string, userId: string): Promise<ICardViewerDocument> {
        return this.cardViewerModel.create({ cardId, userId });
    }
}
