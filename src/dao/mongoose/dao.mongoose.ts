import { Document, LeanDocument } from 'mongoose';
import { Dao } from '../dao';
import { ISchemaQuery } from '../../helpers/schema-creator';
import { IEntityIds } from '../types/scheme';

export abstract class DaoMongoose extends Dao {
    public load<T extends Document>(document: T, relations: string[]): Promise<T> {
        for (const relation of relations) {
            document.populate(relation);
        }

        return document.execPopulate();
    }

    async findById<T extends Document>(id: string, lean = false): Promise<T | LeanDocument<T> | null> {
        const query = this.model.findById(id) as ISchemaQuery<T, null>;

        if (!lean) {
            return query.exec();
        }

        return query.additionalLean().exec();
    }

    async getEntityIdsByFieldData<T extends Document>(
        field: keyof T,
        fieldData: string[]
    ): Promise<IEntityIds> {
        const data: IEntityIds = {};

        return new Promise((resolve, reject) => {
            this.model.find({ [field]: { $in: fieldData.map(item => item.toLowerCase()) } })
                .lean()
                .cursor()
                .on('data', entity => data[entity[field]] = entity._id.toString())
                .on('end', () => resolve(data))
                .on('error', err => reject(err));
        });
    }
}
