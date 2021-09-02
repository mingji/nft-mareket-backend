import { registerAs } from '@nestjs/config';

export interface IAuthConfig {
    jwt: {
        secret: string;
        expiresIn: number;
    };
    signatureExpiresIn: number;
}

export const authConfig = registerAs('auth', () => ({
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN, 10) || 86400000 //24h
    },
    signatureExpiresIn: parseInt(process.env.SIGNATURE_EXPIRES_IN, 10) || 900000 //15m
}));
