import { UserDao } from '../user.dao';
import { InjectModel } from '@nestjs/mongoose';
import { DaoModelNames } from '../../../types/constants';
import { Model } from 'mongoose';
import { IUserDocument, IUserLeanDocument, IUserQuery } from '../../schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { DaoMongoose } from '../../../dao/mongoose/dao.mongoose';

@Injectable()
export class UserMongooseDao extends DaoMongoose implements UserDao {
    @InjectModel(DaoModelNames.user) private readonly userModel: Model<IUserDocument>;

    protected get model(): Model<IUserDocument> {
        return this.userModel;
    }

    async findUserByEthAddress(ethAddress: string): Promise<IUserDocument | null> {
        return this.userModel.findOne({ ethAddress: ethAddress.toLowerCase() }).exec();
    }

    async findUserBySlug(
        slug: string
    ): Promise<IUserDocument | null> {
        return this.userModel.findOne({ slug });
    }

    async createUser(ethAddress: string): Promise<IUserDocument | null> {
        return this.userModel.create({ ethAddress: ethAddress.toLowerCase() });
    }

    async syncUsers(ethAddresses: string[]): Promise<void> {
        const ops = [];

        for (const index in ethAddresses) {
            const ethAddress = ethAddresses[index].toLowerCase();
            ops.push({
                updateOne: {
                    filter: { ethAddress },
                    update: {
                        $setOnInsert: { ethAddress }
                    },
                    upsert: true
                }
            });
        }

        await this.userModel.bulkWrite(ops, { ordered: false });
    }

    async getUsersByEthAddresses(
        ethAddresses: string[],
        lean = false
    ): Promise<Array<IUserLeanDocument | IUserDocument | null>> {
        const query = this.userModel.find(
            { ethAddress: { $in: ethAddresses.map(eth => eth.toLowerCase()) } }
        ) as IUserQuery<IUserDocument[]>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }

    async updateUserById(userId: string, data: Partial<IUserDocument>): Promise<void> {
        await this.userModel.updateOne({ _id: userId }, data);
    }
}
