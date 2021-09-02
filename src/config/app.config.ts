import { registerAs } from '@nestjs/config';

export interface ICryptConfig {
    algorithm: string;
    secretKey: string;
}

export interface IAppConfig {
    nodeEnv: string;
    appName: string;
    appBaseUrl: string;
    port: number;
    appGlobalRoutePrefix: string;
    crypt: ICryptConfig;
    swaggerDocumentationPath: string;
}

export const appConfig = registerAs('app', () => ({
    nodeEnv: process.env.NODE_ENV || 'production',
    appName: process.env.APP_NAME || 'Bondly',
    appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:3000',
    port: parseInt(process.env.APP_PORT, 10) || 3000,
    appGlobalRoutePrefix: process.env.APP_GLOBAL_ROUTE_PREFIX || 'api',
    crypt: {
        algorithm: process.env.CRYPT_ALGOTRITHM || 'aes-256-ctr',
        secretKey: process.env.CRYPT_SECRET_KEY // Must be 256 bits (32 characters)
    },
    swaggerDocumentationPath: process.env.SWAGGER_DOCUMENTATION_PATH || 'api/documentation'
}));
