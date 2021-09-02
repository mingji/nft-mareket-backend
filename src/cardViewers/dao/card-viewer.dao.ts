import { Dao } from '../../dao/dao';
import { ICardViewerDocument } from '../schemas/card-viewers.schema';

export abstract class CardViewerDao extends Dao {
    public abstract existViewer(cardId: string, userId: string): Promise<boolean>;

    public abstract storeViewer(cardId: string, userId: string): Promise<ICardViewerDocument>;
}
