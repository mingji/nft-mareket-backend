import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigService } from './options/jwt-options.service';
import { UserSessionsModule } from '../userSessions/user-sessions.module';
import { SignTypeDataModule } from '../signTypeData/sign-type-data.module';
import { CryptModule } from '../crypt/crypt.module';
import { ClientsModule } from '../external/clients/clients.module';
import { ExternalClientStrategy } from './strategies/external-client.strategy';

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        UserSessionsModule,
        PassportModule,
        SignTypeDataModule,
        CryptModule,
        ClientsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useClass: JwtConfigService
        })
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy, ExternalClientStrategy],
    exports: [AuthService],
    controllers: [AuthController]
})
export class AuthModule {}
