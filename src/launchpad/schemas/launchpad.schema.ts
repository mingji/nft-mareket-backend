import * as mongoose from 'mongoose';
import {DaoIds, DaoModelNames} from '../../types/constants';
import { IUserDocument } from '../../users/schemas/user.schema';
import { ICardDocument } from '../../cards/schemas/cards.schema';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';

export interface ILaunchpadDocument extends mongoose.Document {
    collectionId: mongoose.Schema.Types.ObjectId | IUserDocument | string;
    dateStart: Date;
    dateEnd: Date;
    cards: mongoose.VirtualType | Array<ICardDocument>;
    tiers: mongoose.VirtualType | Array<ICardDocument>;
}

export type ILaunchpadLeanDocument = mongoose.LeanDocument<ILaunchpadDocument>;

export type ILaunchpadQuery<T> = ISchemaQuery<T, ILaunchpadDocument>;

const Schema = schemaCreator(
    {
        collectionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: DaoModelNames.tokenCollection,
        },
        dateStart: {
            type: Date
        },
        dateEnd: {
            type: Date
        },
        cards: {
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        },
        tiers: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },

    },
    {
        collection: DaoIds.launchpad
    }
);

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });

export const LaunchpadSchema = Schema;
