import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { ClassSerializerInterceptor, Controller, Get, Query, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { CryptocurrenciesService } from './cryptocurrencies.service';
import { CryptocurrencyDto } from './dto/cryptocurrency.dto';
import { ArrayResponseDto } from '../dto/array-response.dto';
import { ICryptocurrencyLeanDocument } from './schemas/cryptocurrency.schema';
import { ApiArrayResponse } from '../decorators/api-array-response.decorator';
import { CryptocurrenciesQueryDto } from './dto/cryptocurrencies-query.dto';

@ApiTags('Cryptocurrencies')
@ApiExtraModels(ArrayResponseDto, CryptocurrencyDto)
@Controller('cryptocurrencies')
export class CryptocurrenciesController {
    constructor(private readonly cryptocurrenciesService: CryptocurrenciesService) {}

    @ApiArrayResponse(CryptocurrencyDto)
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('')
    async index(
        @Query() { network }: CryptocurrenciesQueryDto
    ): Promise<ArrayResponseDto<CryptocurrencyDto, ICryptocurrencyLeanDocument>> {
        const data = await this.cryptocurrenciesService.getAllowedCurrencies(network);

        return new ArrayResponseDto<CryptocurrencyDto, ICryptocurrencyLeanDocument>(data, CryptocurrencyDto);
    }
}
