import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { NonceService } from './nonce.service';
import { NextNonceDto } from './dto/next-nonce.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Nonce')
@Controller('nonce')
export class NonceController {
    constructor(private nonceService: NonceService) {}

    @ApiOkResponse({ type: NextNonceDto })
    @ApiInternalServerErrorResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @Get()
    async nextNonce(): Promise<NextNonceDto> {
        return new NextNonceDto(await this.nonceService.getNextNonce());
    }
}
