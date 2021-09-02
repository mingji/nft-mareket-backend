import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { WinstonOptionsService } from './logger/winston-options.service';
import * as winston from 'winston';
import { createApp } from './app';
import * as express from 'express';

async function bootstrap() {
    const app = await createApp(express());

    const configService = app.get(ConfigService);
    const port = configService.get<number>('app.port');

    const logger = app.get(WINSTON_MODULE_PROVIDER);

    await app.listen(port, () => logger.info(`Server app listen on port ${port}`));
}

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

bootstrap().catch((reason) => winston.error(`Error on bootstrap app:`, reason));
