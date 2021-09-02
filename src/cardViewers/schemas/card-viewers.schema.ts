import * as mongoose from 'mongoose';
import { DaoIds, DaoModelNames } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ICardDocument } from '../../cards/schemas/cards.schema';

export interface ICardViewerDocument extends mongoose.Document {
    userId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    cardId: mongoose.Schema.Types.ObjectId | ICardDocument | string;
}

export type ICardViewerLeanDocument = mongoose.LeanDocument<ICardViewerDocument>;

export type ICardViewerQuery<T> = ISchemaQuery<T, ICardViewerDocument>;

const Schema = schemaCreator<ICardViewerDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.user,
            required: true
        },
        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: DaoModelNames.card,
            required: true
        },
    },
    {
        collection: DaoIds.cardViewers
    }
);

Schema.index({ userId: 1, cardId: 1}, { unique: true });
Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const CardViewerSchema = Schema;
