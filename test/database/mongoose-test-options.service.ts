import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongooseLeanGetters from 'mongoose-lean-getters';
import * as mongooseLeanDefaults from 'mongoose-lean-defaults';
import * as mongoose from 'mongoose';
import { IMongoDbConnectionConfig } from '../../src/config';
import { v4 } from 'uuid';

@Injectable()
export class MongooseTestOptionsService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        const { uri, dbName, debug } = this.configService.get<IMongoDbConnectionConfig>(`database.mongoDb`);

        return {
            uri,
            dbName: `${dbName}_${v4()}`,
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
