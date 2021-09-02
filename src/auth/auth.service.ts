import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUserDocument } from '../users/schemas/user.schema';
import { IAuthUser, IJwtPayload } from './types/auth-scheme';
import { UserSessionsService } from '../userSessions/user-sessions.service';
import { ConfigService } from '@nestjs/config';
import { IAuthConfig } from '../config';
import { UserSignatureRequestsService } from '../signTypeData/user-signature-requests.service';
import { CryptService } from '../crypt/crypt.service';
import { LoginDto } from './dto/login.dto';
import { SignTypeDataService } from '../signTypeData/sign-type-data.service';
import { ClientsService } from '../external/clients/clients.service';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { IClientDocument } from '../external/clients/schemas/client.schema';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly userSessionsService: UserSessionsService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly signTypeDataService: SignTypeDataService,
        private readonly userSignatureRequestsService: UserSignatureRequestsService,
        private readonly cryptService: CryptService,
        private readonly clientsService: ClientsService
    ) {}

    async validateUser(
        signature: string,
        ethAddress: string,
        requestId: string
    ): Promise<Partial<IUserDocument> | null> {
        try {
            const request = await this.userSignatureRequestsService.findActualSignatureByRequestId(requestId);

            if (!request) {
                return null;
            }

            const decryptedMessage = this.cryptService.decrypt(request.message);

            if (!this.signTypeDataService.checkUserSignature(JSON.parse(decryptedMessage), signature, ethAddress)) {
                return null;
            }

            const user: IUserDocument =
                (await this.usersService.findUserByEthAddress(ethAddress)) ||
                (await this.usersService.createUser(ethAddress));

            if (!user) {
                return null;
            }

            return {
                id: user.id
            };
        } catch (exception) {
            throw new UnauthorizedException();
        }
    }

    async login(user: IUserDocument): Promise<LoginDto> {
        const {
            jwt: { expiresIn }
        } = this.configService.get<IAuthConfig>('auth');
        const expireAt = new Date(new Date().getTime() + expiresIn);
        const session = await this.userSessionsService.createUserSession(user.id, expireAt);
        const payload: IJwtPayload = {
            sub: user.id,
            sessionId: session.id
        };

        return {
            accessToken: this.jwtService.sign(payload),
            userId: user.id,
        };
    }

    async logout({ sessionId }: IAuthUser): Promise<void> {
        await this.userSessionsService.deleteSessionById(sessionId);
    }

    async validateExternalClient(
        clientId: string,
        request: Request,
        token: string
    ): Promise<IClientDocument | null> {
        const client = await this.clientsService.findByClientId(clientId);

        if (!client) {
            return null;
        }

        const clientSecret = this.cryptService.decrypt(client.clientSecret);

        if (AuthService.calculateHashBySecretAndRequest(clientSecret, request) !== token) {
            return null;
        }

        return client;
    }

    static calculateHashBySecretAndRequest(
        clientSecret: string,
        { method, path, query, body }: Request
    ): string {
        query = Object.keys(query)
            .sort()
            .reduce(
                (obj, key) => {
                    obj[key] = query[key];
                    return obj;
                },
                {}
            );

        try {
            return createHmac('sha256', clientSecret)
                .update(`${method}-${path}-${JSON.stringify(query)}-${JSON.stringify(body)}-${clientSecret}`)
                .digest('hex');
        } catch (exception) {
            return null;
        }
    }
}
