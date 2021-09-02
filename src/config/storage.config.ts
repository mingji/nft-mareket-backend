import { registerAs } from '@nestjs/config';

export interface IS3Config {
    accessKeyId: string | null;
    secretAccessKey: string | null;
    endpoint: string | null;
    bucketPublic: string | null;
    bucketFrontend: string | null;
}

export interface IStorageConfig {
    s3: IS3Config;
}

export const storageConfig = registerAs('storage', () => ({
    s3: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || null,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || null,
        endpoint: process.env.STORAGE_S3_ENDPOINT || null,
        bucketPublic: process.env.STORAGE_S3_BUCKET_PUBLIC || null,
        bucketFrontend: process.env.STORAGE_S3_BUCKET_FRONTEND || null,
    }
}));
