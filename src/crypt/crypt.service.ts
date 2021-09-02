import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { IAppConfig } from '../config';
import { IEncryptedData } from '../types/scheme';

@Injectable()
export class CryptService {
    constructor(private readonly configService: ConfigService) {}

    encrypt(text: string): IEncryptedData {
        const { crypt: cryptConfig } = this.configService.get<IAppConfig>('app');
        const iv = randomBytes(16);
        const cipher = createCipheriv(cryptConfig.algorithm, cryptConfig.secretKey, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

        return {
            iv: iv.toString('hex'),
            content: encrypted.toString('hex')
        };
    }

    decrypt(hash: IEncryptedData): string {
        const { crypt: cryptConfig } = this.configService.get<IAppConfig>('app');
        const decipher = createDecipheriv(
            cryptConfig.algorithm,
            cryptConfig.secretKey,
            Buffer.from(hash.iv, 'hex')
        );

        return Buffer.concat([
            decipher.update(Buffer.from(hash.content, 'hex')),
            decipher.final()
        ]).toString();
    }
}
