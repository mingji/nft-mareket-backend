import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import * as winston from 'winston';
import { WinstonOptionsService } from '../../logger/winston-options.service';
import { DaoModelNames } from '../../types/constants';
import * as data from './data/categories.json';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICategoryDocument } from '../../categories/schemas/categories.schema';
import * as minimist from 'minimist';
import { ENV_STAGE } from './types/constants';
import { Errors } from './types/errors';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on categories seed (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on categories seed (uncaughtException):`, reason);
});

const stage = minimist(process.argv.slice(2)).stage;

if (Object.values(ENV_STAGE).indexOf(stage) === -1) {
    throw new Error(Errors.INVALID_OPTION_STAGE);
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const categoryModel = app.get<Model<ICategoryDocument>>(getModelToken(DaoModelNames.category));

    const categories = data.slice().map(category => {
        const { location, bucket } = category.icon;
        category.icon.location = location.replace(':stage', stage);
        category.icon.bucket = bucket.replace(':stage', stage);
        return category;
    });

    await categoryModel.insertMany(categories);

    await app.close();
}

bootstrap().catch(reason => {
    console.log(`Error on categories seed:`, reason);
    process.exit(1);
});
