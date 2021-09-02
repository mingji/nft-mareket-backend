import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ExternalClientAuthenticateDto } from '../dto/external-client-authenticate.dto';
import { IClientDocument } from '../../external/clients/schemas/client.schema';
import { GUARD } from '../types/enums';

@Injectable()
export class ExternalClientStrategy extends PassportStrategy(Strategy, GUARD.EXTERNAL_CLIENT) {
    constructor(private readonly authService: AuthService) {
        super({ passReqToCallback: true });
    }

    async validate(request: Request, token: string): Promise<IClientDocument | null> {
        const queryDto = plainToClass(ExternalClientAuthenticateDto, request.query);
        const errors = await validate(queryDto);

        if (errors.length > 0) {
            throw new UnauthorizedException();
        }

        const client = await this.authService.validateExternalClient(queryDto.clientId, request, token);

        if (!client) {
            throw new UnauthorizedException();
        }

        return client;
    }
}
