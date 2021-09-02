import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IAuthConfig } from '../../config';
import { IAuthUser, IJwtPayload } from '../types/auth-scheme';
import { UserSessionsService } from '../../userSessions/user-sessions.service';
import { UsersService } from '../../users/users.service';
import { IUserSessionDocument } from '../../userSessions/schemas/user-session.schema';
import { IUserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    @Inject(UserSessionsService)
    private readonly userSessionsService: UserSessionsService;

    @Inject(UsersService)
    private readonly usersService: UsersService;

    constructor(configService: ConfigService) {
        const {
            jwt: { secret }
        } = configService.get<IAuthConfig>('auth');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret
        });
    }

    async validate(payload: IJwtPayload): Promise<IAuthUser> {
        const session = await this.userSessionsService.getById<IUserSessionDocument>(payload.sessionId, true);

        if (!session || session.userId.toString() !== payload.sub) {
            throw new UnauthorizedException();
        }

        if (!session.isActive) {
            throw new UnauthorizedException();
        }

        const user = await this.usersService.getById<IUserDocument>(payload.sub, true);

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            sessionId: payload.sessionId,
            ...user
        };
    }
}
