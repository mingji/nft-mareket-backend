import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { IHtmlData } from './types/scheme';

@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) {}

    private getHtmlForMail(htmlData: IHtmlData) {
        const { message, link, walletAddress } = htmlData;

        return `
            <b>${message}</b>
            ${walletAddress ? '<br><b>${walletAddress}</b>' : ''}
            <br>
            <a href='${link}'>${link}</a>
        `;
    };

    async sendMail(email: string, subject: string, htmlData: IHtmlData): Promise<void> {
        const mailerEmail = this.configService.get<string>('mail.email');
        const from = `${email} <${mailerEmail}>`

        await this.mailerService.sendMail({ from, subject, html: this.getHtmlForMail(htmlData) });
    }
}