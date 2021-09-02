import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import * as winston from 'winston';
import { WinstonOptionsService } from '../../logger/winston-options.service';
import { NonceService } from '../../nonce/nonce.service';
import { Nonce } from '../../types/constants';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on nonce seed (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on nonce seed (uncaughtException):`, reason);
});

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    await app.get(NonceService).initNonce(Nonce.default, 0);

    await app.close();
}

bootstrap().catch(reason => {
    console.log(`Error on nonce seed:`, reason);
    process.exit(1);
});
