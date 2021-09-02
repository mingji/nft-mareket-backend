import {
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Request,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserSignatureRequestsService } from '../signTypeData/user-signature-requests.service';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { SignInInputDto } from './dto/sign-in-input.dto';
import { LoginDto } from './dto/login.dto';
import { SignTypeDataMetamask_v3Dto } from '../signTypeData/dto/sign-type-data-metamask_v3.dto';
import { SignTypeDataArkane_v3Dto } from 'src/signTypeData/dto/sign-type-data-arkane_v3.dto';
import { SignatureWalletTypeParamDto } from '../signTypeData/dto/signature-wallet-type-param.dto';
import { WalletType } from '../signTypeData/types/sign-scheme';

@ApiTags('auth')
@Controller()
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userSignatureRequestsService: UserSignatureRequestsService
    ) {}

    @ApiOkResponse({
        type: SignTypeDataMetamask_v3Dto
    })
    @ApiParam({ name: 'walletType', type: 'string', enum: WalletType, required: true })
    @Get('auth/signature/:walletType')
    async signature(
        @Param() { walletType }: SignatureWalletTypeParamDto
    ): Promise<SignTypeDataMetamask_v3Dto | SignTypeDataArkane_v3Dto> {
        return this.userSignatureRequestsService.requestSignature(walletType);
    }

    @ApiBody({ type: SignInInputDto })
    @ApiCreatedResponse({ type: LoginDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(LocalAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Post('auth/login')
    async login(@Request() req): Promise<LoginDto> {
        return new LoginDto(await this.authService.login(req.user));
    }

    @ApiBearerAuth()
    @ApiNoContentResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @Post('auth/logout')
    @HttpCode(204)
    async logout(@Request() req) {
        await this.authService.logout(req.user);
    }
}
