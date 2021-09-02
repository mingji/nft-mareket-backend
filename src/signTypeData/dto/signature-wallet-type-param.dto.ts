import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletType } from '../types/sign-scheme';

export class SignatureWalletTypeParamDto {
    @ApiProperty({ required: true, enum: Object.values(WalletType) })
    @IsEnum(WalletType)
    walletType: WalletType;
}
