import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMongoDbConnectionConfig } from '../config';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongooseLeanGetters from 'mongoose-lean-getters';
import * as mongooseLeanDefaults from 'mongoose-lean-defaults';
import * as mongoose from 'mongoose';

@Injectable()
export class MongooseOptionsService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        const { uri, dbName, debug } = this.configService.get<IMongoDbConnectionConfig>(`database.mongoDb`);

        return {
            uri,
            dbName,
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectionFactory: (connection) => {
                mongoose.set('useFindAndModify', false);
                mongoose.set('debug', debug);
                connection.plugin(mongooseLeanGetters);
                connection.plugin(mongooseLeanDefaults);
                connection.plugin(mongooseLeanVirtuals);

                return connection;
            }
        };
    }
}
