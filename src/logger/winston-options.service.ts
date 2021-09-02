import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWinstonConfig } from '../config';
import { WinstonModuleOptionsFactory } from 'nest-winston';
import { format, transports } from 'winston';
import { WinstonModuleOptions } from 'nest-winston/dist/winston.interfaces';
import { TransformableInfo } from 'logform';
import * as Transport from 'winston-transport';

@Injectable()
export class WinstonOptionsService implements WinstonModuleOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    static print(info: TransformableInfo): string {
        const log = `${info.timestamp} [${info.level}]: ${info.message}`;
        return info.stack ? `${log}\n${info.stack}` : log;
    }

    static defaultLoggerTransports(): Transport[] {
        return [
            new transports.Console({
                format: format.combine(
                    format.timestamp({ format: 'HH:mm:ss' }),
                    format.printf(WinstonOptionsService.print)
                )
            })
        ];
    }

    createWinstonModuleOptions(): WinstonModuleOptions {
        const { consoleLevel } = this.configService.get<IWinstonConfig>('logger.winston');

        return {
            exitOnError: false,
            transports: [
                new transports.Console({
                    level: consoleLevel,
                    format: format.combine(
                        format.timestamp({ format: 'HH:mm:ss' }),
                        format.printf(WinstonOptionsService.print)
                    )
                })
            ]
        };
    }
}
