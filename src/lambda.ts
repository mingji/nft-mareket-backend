import { Handler, Context } from 'aws-lambda';
import { Server } from 'http';
import * as express from 'express';
import { createServer, proxy } from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import { createApp } from './app';
import * as winston from 'winston';
import { WinstonOptionsService } from './logger/winston-options.service';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

const binaryMimeTypes: string[] = ['*/*'];

let cachedServer: Server;

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on bootstrap server (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on bootstrap server (uncaughtException):`, reason);
});

async function bootstrapServer(): Promise<Server> {
    if (!cachedServer) {
        try {
            const expressApp = express();
            const nestApp = await createApp(expressApp);
            nestApp.use(eventContext());

            await nestApp.init();
            cachedServer = createServer(expressApp, undefined, binaryMimeTypes);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    return Promise.resolve(cachedServer);
}

export const handler: Handler = async (event: any, context: Context) => {
    cachedServer = await bootstrapServer();
    return proxy(cachedServer, event, context, 'PROMISE').promise;
};
