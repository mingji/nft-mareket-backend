import * as winston from 'winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CardSalesService } from './cardSales/card-sales.service';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from './config';
import { Context, Handler } from 'aws-lambda';
import { Blockchain, Network } from './config/types/constants';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on maticSellListener (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on maticSellListener (uncaughtException):`, reason);
});

export const handler: Handler = async (event: any, context: Context) => {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);

        const network = Network.MATIC;
        const { saleContract } = app.get(ConfigService).get<IBlockchainConfig>('blockchain')[network];
        for (let i = 0; i < Blockchain.COUNT_PROCESSED_BLOCK_PER_JOB_MATIC; i++) {
            await app.get(CardSalesService).processSell(Network.MATIC, saleContract);
        }

        await app.close();
    } catch (e) {
        winston.error(`Error on maticSellListener (handler):`, e);
        throw e;
    }
};
