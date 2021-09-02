import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';
import {
    ICryptocurrencyDocument,
    ICryptocurrencyLeanDocument,
    ICryptocurrencyQuery
} from '../../schemas/cryptocurrency.schema';
import { CryptocurrencyDao } from '../cryptocurrency.dao';

@Injectable()
export class CryptocurrencyMongooseDao extends DaoMongoose implements CryptocurrencyDao {
    @InjectModel(DaoModelNames.cryptocurrency) private readonly cryptocurrencyModel: Model<ICryptocurrencyDocument>;

    protected get model(): Model<ICryptocurrencyDocument> {
        return this.cryptocurrencyModel;
    }

    async removeOldCurrencies(date: Date): Promise<void> {
        return this.cryptocurrencyModel.deleteMany({ createdAt: { $lt: date } });
    }

    async updateCurrencies(data: ICryptocurrencyLeanDocument[]): Promise<void> {
        const ops = [];

        const ids = data.map(item => {
            ops.push({
                updateOne: {
                    filter: { id: item.id },
                    update: {
                        $set: item
                    },
                    upsert: true
                }
            });
            return item.id;
        });

        await this.cryptocurrencyModel.bulkWrite(ops, { ordered: false });
        await this.cryptocurrencyModel.deleteMany({ id: { $nin: ids } });
    }

    async getCurrencyBySymbol(
        symbol: string,
        lean = false
    ): Promise<ICryptocurrencyLeanDocument | ICryptocurrencyDocument | null> {
        const query = this.cryptocurrencyModel
            .findOne({ symbol }) as ICryptocurrencyQuery<ICryptocurrencyDocument>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }

    async getCurrenciesBySymbols(
        symbols: string[],
        lean = false
    ): Promise<Array<ICryptocurrencyLeanDocument | ICryptocurrencyDocument>> {
        const query = this.cryptocurrencyModel
            .find({ symbol: { $in: symbols } }) as ICryptocurrencyQuery<ICryptocurrencyDocument[]>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }
}
