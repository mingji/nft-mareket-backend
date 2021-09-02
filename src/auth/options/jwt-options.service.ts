import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAuthConfig } from '../../config';
import { JwtModuleOptions, JwtOptionsFactory } from '@nestjs/jwt';

@Injectable()
export class JwtConfigService implements JwtOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createJwtOptions(): JwtModuleOptions {
        const { jwt } = this.configService.get<IAuthConfig>('auth');

        return {
            secret: jwt.secret,
            signOptions: {
                expiresIn: jwt.expiresIn
            }
        };
    }
}
