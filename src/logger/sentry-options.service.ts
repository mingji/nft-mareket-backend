import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAppConfig, ISentryConfig } from '../config';
import { SentryOptionsFactory } from '@ntegral/nestjs-sentry';
import { SentryModuleOptions } from '@ntegral/nestjs-sentry/lib/sentry.interfaces';

@Injectable()
export class SentryOptionsService implements SentryOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createSentryModuleOptions(): SentryModuleOptions {
        const { nodeEnv } = this.configService.get<IAppConfig>('app');
        const { dsn } = this.configService.get<ISentryConfig>('logger.sentry');

        return {
            dsn,
            environment: nodeEnv
        };
    }
}
