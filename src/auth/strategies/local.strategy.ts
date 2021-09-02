import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { SignIn, SignInInputDto } from '../dto/sign-in-input.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { IUserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            usernameField: SignIn.UsernameField,
            passwordField: SignIn.PasswordField,
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        username: SignInInputDto[SignIn.UsernameField]
    ): Promise<Partial<IUserDocument>> {
        const signInPost = plainToClass(SignInInputDto, request.body);
        const errors: any = await validate(signInPost);

        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        const user = await this.authService.validateUser(username, signInPost.address, signInPost.requestId);

        if (!user) {
            throw new UnauthorizedException();
        }

        return user;
    }
}
