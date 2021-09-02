import { Injectable } from '@nestjs/common';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { CardViewerDao } from './dao/card-viewer.dao';
import { ICardViewerDocument } from './schemas/card-viewers.schema';

@Injectable()
export class CardViewersService extends MongooseService {
    constructor(
        private readonly cardViewerDao: CardViewerDao
    ) {
        super();
    }

    protected get dao(): CardViewerDao {
        return this.cardViewerDao;
    }

    async existViewer(cardId: string, userId: string): Promise<boolean> {
        return this.dao.existViewer(cardId, userId);
    }

    async storeViewer(cardId: string, userId: string): Promise<ICardViewerDocument> {
        return this.dao.storeViewer(cardId, userId);
    }
}
