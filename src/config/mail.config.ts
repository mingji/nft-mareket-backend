import { registerAs } from '@nestjs/config';

export interface MailConfig {
    email: string;
    host: string;
    password: string;
}

export enum Subjects {
    user = 'user',
    tokenCollection = 'tokenCollection',
    card = 'card',
}

export const getMailSubject = (subject: Subjects, id: string): string => {
    switch (subject) {
        case Subjects.user: {
            return `Report User ${id}`
        }
        case Subjects.tokenCollection: {
            return `Report Token Collection ${id}`
        }
        case Subjects.card: {
            return `Report Card ${id}`
        }
    }
};

export const mailConfig = registerAs('mail', (): MailConfig => ({
    email: process.env.MAILER_EMAIL || '',
    host: process.env.MAILER_HOST || '',
    password: process.env.MAILER_PASSWORD || '',
}));

