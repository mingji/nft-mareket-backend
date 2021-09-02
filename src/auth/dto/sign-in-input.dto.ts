import { IsHexadecimal, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SignIn {
    UsernameField = 'signature',
    PasswordField = 'signature'
}

export class SignInInputDto {
    @ApiProperty({
        description: 'Signed message'
    })
    @IsString()
    @IsNotEmpty()
    [SignIn.UsernameField]: string;

    @ApiProperty({
        description: 'The user metamask address'
    })
    @IsHexadecimal()
    @IsNotEmpty()
    address: string;

    @ApiProperty({
        description: 'The value is derived from api /api/auth/signature (domain.reqId)'
    })
    @IsUUID()
    @IsNotEmpty()
    requestId: string;
}
