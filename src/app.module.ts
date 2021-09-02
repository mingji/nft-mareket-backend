import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
    appConfig,
    authConfig,
    blockchainConfig,
    contractsConfig,
    databaseConfig,
    loggerConfig,
    servicesConfig,
    storageConfig,
    mailConfig
} from './config';
import { AuthModule } from './auth/auth.module';
import { MongooseOptionsService } from './database/mongoose-options.service';
import { WinstonModule } from 'nest-winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import { APP_FILTER } from '@nestjs/core';
import { ExceptionsFilter } from './exceptions/exceptions.filter';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { SentryOptionsService } from './logger/sentry-options.service';
import { TokenCollectionsModule } from './tokenCollections/token-collections.module';
import { CategoriesModule } from './categories/categories.module';
import { S3Module } from 'nestjs-s3';
import { S3OptionsService } from './utils/s3-options.service';
import { CryptocurrenciesModule } from './cryptocurrencies/cryptocurrencies.module';
import { StoreFrontsModule } from './storeFronts/store-fronts.module';
import { SubgraphModule } from './subgraph/subgraph.module';
import * as expressMongoSanitize from 'express-mongo-sanitize';
import { MetadataModule } from './metadata/metadata.module';
import { JobsModule } from './jobs/jobs.module';
import { SearchModule } from './search/search.module';
import { FollowsModule } from './follows/follows.module';
import { ExternalModule } from './external/external.module';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useClass: MongooseOptionsService
        }),
        ConfigModule.forRoot({
            load: [
                appConfig,
                authConfig,
                loggerConfig,
                storageConfig,
                servicesConfig,
                databaseConfig,
                contractsConfig,
                blockchainConfig,
                mailConfig
            ]
        }),
        WinstonModule.forRootAsync({
            imports: [ConfigModule],
            useClass: WinstonOptionsService
        }),
        SentryModule.forRootAsync({
            imports: [ConfigModule],
            useClass: SentryOptionsService
        }),
        S3Module.forRootAsync({
            imports: [ConfigModule],
            useClass: S3OptionsService
        }),
        AuthModule,
        TokenCollectionsModule,
        CategoriesModule,
        CryptocurrenciesModule,
        StoreFrontsModule,
        SubgraphModule,
        MetadataModule,
        JobsModule,
        SearchModule,
        FollowsModule,
        ExternalModule
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ExceptionsFilter
        }
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(expressMongoSanitize())
            .forRoutes('*');
    }
}
