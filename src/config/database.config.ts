import { registerAs } from '@nestjs/config';

export interface IMongoDbConnectionConfig {
    uri: string;
    dbName: string;
    debug: boolean;
}

export interface IDatabaseConfig {
    mongoDb: IMongoDbConnectionConfig;
}

export const databaseConfig = registerAs('database', () => ({
    mongoDb: {
        uri: process.env.MONGODB_URL || 'mongodb://localhost:27017',
        dbName: process.env.MONGODB_NAME || 'bprotect',
        debug: process.env.MONGODB_DEBUG === 'true' || false
    }
}));
