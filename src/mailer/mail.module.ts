import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { MailOptionsService } from './mail-options.service';

@Module({
    imports: [
        ConfigModule,
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useClass: MailOptionsService,
        }),
    ],
    providers: [MailService],
    exports: [MailService]
})
export class MailModule {}