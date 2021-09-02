import * as mongoose from 'mongoose';
import { PopulateOptions } from 'mongoose';

export interface ISchemaQuery<T, D extends mongoose.Document> extends mongoose.Query<T, D> {
    additionalLean(): ISchemaQuery<T, D>;
    with(relations: Array<string | PopulateOptions | Array<PopulateOptions>>): ISchemaQuery<T, D>;
}

export const schemaCreator = <T extends mongoose.Document>(options, configs) => {
    const schema = new mongoose.Schema<T>({
        ...options,
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }, configs);
    
    schema.query.additionalLean = function () {
        return this.lean({ virtuals: true, getters: true, defaults: true });
    };

    schema.query.with = function (relations: string[]) {
        for (const relation of relations) {
            this.populate(relation);
        }
    };

    return schema;
}