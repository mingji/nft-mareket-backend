import { FilterQuery, Model, PopulateOptions } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CardDao, IGetCardsQuery } from '../card.dao';
import { IBalanceCard, ICardDocument, ICardLeanDocument, ICardQuery } from '../../schemas/cards.schema';
import { DaoModelNames, Reaction, SortOrder } from '../../../types/constants';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import { ObjectID } from 'mongodb';
import { IOwnerCardsInCollection } from '../../types/scheme';
import * as mongoose from 'mongoose';

@Injectable()
export class CardMongooseDao extends DaoMongoose implements CardDao {
    @InjectModel(DaoModelNames.card) private readonly cardModel: Model<ICardDocument>;

    protected get model(): Model<ICardDocument> {
        return this.cardModel;
    }

    async getCards(
        find: IGetCardsQuery,
        lean = false,
        ids?: string[],
        userId?: string,
        relations?: Array<string | PopulateOptions>
    ): Promise<ICardDocument[]> {
        const { sortField, sortOrder, offset, limit } = find;
        const search = this.getSearchQuery(find, ids, userId);

        const query = this.cardModel
            .find(search)
            .sort({ [sortField || '_id']: sortOrder || SortOrder.desc  })
            .skip(offset)
            .limit(limit) as ICardQuery<ICardDocument[]>;

        if (relations?.length) {
            query.with(relations);
        }

        if (lean) {
            query.additionalLean();
        }

        return query;
    }

    async getCardsCount(
        query: IGetCardsQuery,
        ids?: string[],
        userId?: string
    ): Promise<number> {
        const search = this.getSearchQuery(query, ids, userId);

        return this.cardModel.find(search).countDocuments();
    }

    async getCardsByIds(ids: string[]): Promise<ICardDocument[]> {
        return this.cardModel.find({ _id: { $in: ids } });
    }

    protected getSearchQuery(
        { collections, property, categories, createdBy, sale, search, likedBy }: IGetCardsQuery,
        ids?: string[],
        userId?: string
    ): FilterQuery<ICardDocument> {
        return {
            ...( likedBy ? { likes: { $in: [likedBy] } } : null ),
            ...( collections ? { tokenCollectionId: { $in: collections } } : null ),
            ...( property?.property && property?.value ? { 'properties': { $elemMatch: { ...property } } } : null ),
            ...( categories ? { categoryId: { $in: categories } } : null ),
            ...( typeof sale !== 'undefined' ? { hasSale: sale } : null ),
            ...( ids ? { _id: { $in: ids } } : null ),
            ...( userId ? { 'balances.userId': userId } : null ),
            ...( createdBy ? { creator: createdBy } : null),
            ...( search ? { name: { $regex: `^.*(${search}).*$`, $options: 'i' } } : null)
        };
    }

    async syncCard(tokenId: string, card: Partial<ICardLeanDocument>): Promise<void> {
        await this.cardModel.updateOne({ tokenId }, card, { upsert: true });
    }

    async getUnusedCardsByCollection(
        tokenCollectionId: string,
        excludeTokenIds: string[]
    ): Promise<ICardLeanDocument[]> {
        const query = this.cardModel.find({
            tokenCollectionId, tokenId: { $nin: excludeTokenIds }
        }) as ICardQuery<ICardDocument[]>

        return query.additionalLean();
    }

    async deleteCardsByIds(ids: string[]): Promise<void> {
        await this.cardModel.deleteMany({ _id: { $in: ids } });
    }

    async changeOwnerships(
        card: string | ICardDocument,
        tokensCount: number,
        makerId: string,
        takerId: string,
        takerEthAddress: string
    ): Promise<void> {
        if (typeof card === 'string') {
            card = await this.findById<ICardDocument>(card) as ICardDocument;
        }

        if (!card) {
            return;
        }

        const userBalances: { [key: string]: { balance: IBalanceCard, index: number } } = {};

        card.balances.forEach((balance, index) => {
            switch (balance.userId.toString()) {
                case makerId:
                    userBalances[makerId] = { balance, index };
                    return;
                case takerId:
                    userBalances[takerId] = { balance, index };
                    return;
            }
        });

        const { [makerId]: makerBalance, [takerId]: takerBalance } = userBalances;

        if (!makerBalance) {
            return;
        }

        makerBalance.balance.tokenAmount -= tokensCount;
        if (makerBalance.balance.tokenAmount <= 0) {
            card.balances.splice(makerBalance.index,1);
        }

        if (takerBalance) {
            takerBalance.balance.tokenAmount += tokensCount;
        } else {
            takerEthAddress = takerEthAddress.toLowerCase();
            card.balances.push({
                balanceId: `${card.tokenId}-${takerEthAddress}`,
                tokenAmount: tokensCount,
                userId: takerId,
                ethAddress: takerEthAddress
            })
        }

        /**
         * For more performance, see https://docs.mongodb.com/manual/reference/method/db.collection.initializeOrderedBulkOp/
         * For example:
             const bulk = this.cardModel.collection.initializeOrderedBulkOp();
             bulk.find({ _id: new mongoose.Types.ObjectId(cardId) }).updateOne({ $pull: { ...pullQuery } });
             bulk.find({ _id: new mongoose.Types.ObjectId(cardId) }).updateOne({ $push: { ...pushQuery } });
             await bulk.execute();
         */
        await card.save();
    }

    async increaseViewersCount(cardId: string): Promise<void> {
        await this.cardModel.findByIdAndUpdate(cardId, { $inc: { viewersCount: 1 } });
    }

    async updateCardHasSale(cardId: string, hasSale: boolean): Promise<void> {
        await this.model.findByIdAndUpdate(cardId, { hasSale });
    }

    async createCards(cards: ICardLeanDocument[]): Promise<void> {
        await this.model.insertMany(cards);
    }

    async getCardsByIdsAndCollectionIds(
        ids: string[],
        collectionIds: string[],
        projection?: string[]
    ): Promise<ICardLeanDocument[]> {
        const query = this.model.find({
            _id: { $in: ids },
            tokenCollectionId: { $in: collectionIds }
        }) as ICardQuery<ICardDocument[]>;

        if (projection) {
            query.select(projection);
        }

        return query.additionalLean();
    }

    async getOwnerCardsCountByCollectionsIds(
        tokenCollectionIds: string[],
        userId: string
    ): Promise<IOwnerCardsInCollection[]> {
        return this.model.aggregate([
            {
                $match: {
                    tokenCollectionId: { $in: tokenCollectionIds.map(id => new ObjectID(id)) },
                    balances: { $elemMatch: { userId: new ObjectID(userId) } }
                }
            },
            {
                $group: {
                    _id: '$tokenCollectionId',
                    userCardsCount: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id: 0,
                    tokenCollectionId: { $toString: '$_id' },
                    userCardsCount: 1
                }
            }
        ]);
    }

    async findCardByTokenCollectionIdAndIdentifier(
        tokenCollectionId: string,
        identifier: number
    ): Promise<ICardDocument> {
        return this.model.findOne({ tokenCollectionId, identifier });
    }

    async burnCard(
        tokenCollectionId: string,
        identifier: number,
        ownerId: string,
        amount: number
    ): Promise<string | null> {
        const card = await this.findCardByTokenCollectionIdAndIdentifier(tokenCollectionId, identifier);
        if (!card) {
            return null;
        }

        const balanceIndex = card.balances.findIndex(balance => balance.userId.toString() === ownerId);
        if (balanceIndex === -1) {
            return null;
        }

        const balance = card.balances[balanceIndex];
        if (!balance) {
            return null;
        }

        balance.tokenAmount -= amount;

        if (balance.tokenAmount <= 0) {
            card.balances.splice(balanceIndex,1);
        }

        if (!card.balances.length) {
            await card.delete();
            return card.id;
        }

        card.totalSupply -= amount;

        await card.save();

        return card.id;
    }

    async toggleLikeOrDislike(
        userId: string,
        cardId: string,
        reaction: Reaction
    ): Promise<void> {
        const card = await this.cardModel.findById(cardId);

        if (!card) {
            return;
        }

        switch (reaction) {
            case Reaction.likes: {
                const isLiked = card.likes.findIndex(like => like.toString() === userId) > -1;
                const query = isLiked
                    ? { $pull: { likes: userId } }
                    : { $pull: { dislikes: userId }, $push: { likes: userId } }
                await this.cardModel.updateOne({_id: cardId}, { ...query });
                break;
            }
            case Reaction.dislikes: {
                const isDisliked = card.dislikes.findIndex(dislike => dislike.toString() === userId) > -1;
                const query = isDisliked
                    ? { $pull: { dislikes: userId } }
                    : { $push: { dislikes: userId }, $pull: { likes: userId } }
                await this.cardModel.updateOne({_id: cardId}, { ...query });
                break;
            }
        }
    }
}
