import { registerAs } from '@nestjs/config';

export type LoggerLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface IWinstonConfig {
    consoleLevel: LoggerLevel;
    fileLevel: LoggerLevel;
    maxFileSize: string;
    maxFiles: string;
}

export interface ISentryConfig {
    dsn: string;
}

export interface ILoggerConfig {
    winston: IWinstonConfig;
    sentry: ISentryConfig;
}

export const loggerConfig = registerAs('logger', () => ({
    winston: {
        consoleLevel: process.env.LOG_CONSOLE_LEVEL || 'silly',
        fileLevel: process.env.LOG_FILE_LEVEL || 'verbose',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '5d'
    },
    sentry: {
        dsn: process.env.SENTRY_DSN || ''
    }
}));
