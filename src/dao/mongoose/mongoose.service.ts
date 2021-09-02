import { Document, LeanDocument } from 'mongoose';
import { DaoMongoose } from './dao.mongoose';
import { IEntityIds } from '../types/scheme';

export abstract class MongooseService {
    protected abstract get dao(): DaoMongoose;

    async loadRelations<T extends Document>(document: T, relations: string[]): Promise<T> {
        return this.dao.load<T>(document, relations);
    }

    async getById<T extends Document>(id: string, lean = false): Promise<T | LeanDocument<T> | null> {
        return this.dao.findById<T>(id, lean);
    }

    async getEntityIdsByFieldData<T extends Document>(
        field: keyof T,
        fieldData: string[]
    ): Promise<IEntityIds> {
        return this.dao.getEntityIdsByFieldData<T>(field, fieldData);
    }
}
