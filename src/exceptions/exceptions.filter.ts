import {
    ArgumentsHost,
    ExceptionFilter,
    HttpException,
    HttpServer,
    HttpStatus,
    Inject,
    Optional
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { AbstractHttpAdapter, HttpAdapterHost } from '@nestjs/core';
import { MESSAGES } from '@nestjs/core/constants';
import { Logger } from 'winston';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ServiceError } from './service.error';

export class ExceptionsFilter<T = any> implements ExceptionFilter {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    @InjectSentry()
    private readonly sentryService: SentryService;

    @Optional()
    @Inject()
    protected readonly httpAdapterHost?: HttpAdapterHost;

    constructor(protected readonly applicationRef?: HttpServer) {}

    catch(exception: T, host: ArgumentsHost) {
        const applicationRef =
            this.applicationRef || (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

        if (exception instanceof ServiceError) {
            return this.handleServiceError(exception, host, applicationRef);
        }

        if (!(exception instanceof HttpException)) {
            return this.handleUnknownError(exception, host, applicationRef);
        }

        const res = exception.getResponse();
        const message = isObject(res)
            ? res
            : {
                  statusCode: exception.getStatus(),
                  message: res
              };

        applicationRef.reply(host.getArgByIndex(1), message, exception.getStatus());
    }

    handleUnknownError(
        exception: T,
        host: ArgumentsHost,
        applicationRef: AbstractHttpAdapter | HttpServer
    ) {
        const body = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE
        };
        applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);

        this.sentryService.captureException(exception);

        return this.logger.error(
            'A caught error by exception filter:',
            this.isExceptionObject(exception) ? exception : { message: exception }
        );
    }

    isExceptionObject(err: any): err is Error {
        return isObject(err) && !!(err as Error).message;
    }

    handleServiceError(
        exception: ServiceError,
        host: ArgumentsHost,
        applicationRef: AbstractHttpAdapter | HttpServer
    ): void {
        const body = {
            statusCode: HttpStatus.BAD_REQUEST,
            message: exception.message
        };
        applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);
    }
}
