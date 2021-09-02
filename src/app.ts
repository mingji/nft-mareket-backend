import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { IAppConfig } from './config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Express } from 'express';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';

export async function createApp(expressApp: Express): Promise<INestApplication> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressApp));
    const configService = app.get(ConfigService);
    const { appGlobalRoutePrefix, appName, swaggerDocumentationPath, nodeEnv } = configService.get<IAppConfig>('app');

    app.enableCors();
    app.setGlobalPrefix(appGlobalRoutePrefix);
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            validationError: {
                target: false
            },
            exceptionFactory: (errors) => new BadRequestException(errors)
        })
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    if (nodeEnv !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle(appName)
            .setDescription(`${appName} API description`)
            .addBearerAuth()
            .build();
        const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup(swaggerDocumentationPath, app, swaggerDocument);
    }

    return app;
}
