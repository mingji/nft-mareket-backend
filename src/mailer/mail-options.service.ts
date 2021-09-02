import { MailerOptions, MailerOptionsFactory } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailConfig } from '../config';

@Injectable()
export class MailOptionsService implements MailerOptionsFactory{
    constructor(private readonly configService: ConfigService) {}

    createMailerOptions(): MailerOptions {
        const { email, host, password } = this.configService.get<MailConfig>('mail');
        return {
            defaults: {
                to: email,
                from: email,
            },
            transport: {
                host,
                secure: true,
                auth: {
                    user: email,
                    pass: password,
                },
            },
        }
    }
}
