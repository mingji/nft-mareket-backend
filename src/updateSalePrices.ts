import { Handler, Context } from 'aws-lambda';
import * as winston from 'winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CardSalesService } from './cardSales/card-sales.service';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on updateSalePrices (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on updateSalePrices (uncaughtException):`, reason);
});

export const handler: Handler = async (event: any, context: Context) => {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        await app.get(CardSalesService).updateAllSalePriceUsd();
        await app.close();
    } catch (e) {
        winston.error(`Error on updateSalePrices (handler):`, e);
        throw e;
    }
};
