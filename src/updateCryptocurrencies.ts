import { Handler, Context } from 'aws-lambda';
import * as winston from 'winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CryptocurrenciesService } from './cryptocurrencies/cryptocurrencies.service';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on updateCryptocurrencies (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on updateCryptocurrencies (uncaughtException):`, reason);
});

export const handler: Handler = async (event: any, context: Context) => {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        await app.get(CryptocurrenciesService).updateCurrencies();
        await app.close();
    } catch (e) {
        winston.error(`Error on updateCryptocurrencies (handler):`, e);
        throw e;
    }
};
