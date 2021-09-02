import { Document, LeanDocument, Model } from 'mongoose';
import { IEntityIds } from './types/scheme';

export abstract class Dao {
    protected abstract get model(): Model<any>;

    public abstract load<T extends Document>(document: T, relations: string[]): Promise<T>;

    public abstract findById<T extends Document>(id: string, lean?: boolean): Promise<T | LeanDocument<T> | null>;

    public abstract getEntityIdsByFieldData<T extends Document>(
        field: keyof T,
        fieldData: string[]
    ): Promise<IEntityIds>;
}
