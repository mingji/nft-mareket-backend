import * as winston from 'winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Context, Handler } from 'aws-lambda';
import { Blockchain, Network } from './config/types/constants';
import { TokenCollectionsService } from './tokenCollections/token-collections.service';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on maticCreatedContractListener (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on maticCreatedContractListener (uncaughtException):`, reason);
});

export const handler: Handler = async (event: any, context: Context) => {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);

        for (let i = 0; i < Blockchain.COUNT_PROCESSED_BLOCK_PER_JOB_MATIC; i++) {
            await app.get(TokenCollectionsService).processCreatedContracts(Network.MATIC);
        }

        await app.close();
    } catch (e) {
        winston.error(`Error on maticCreatedContractListener (handler):`, e);
        throw e;
    }
};