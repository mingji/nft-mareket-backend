import { ApiProperty } from '@nestjs/swagger';
import { ISaleContract } from '../../schemas/token-collection.schema';
import { CryptocurrencyDto } from '../../../cryptocurrencies/dto/cryptocurrency.dto';

export class SaleContractDto {
    @ApiProperty()
    saleContract: string;

    @ApiProperty()
    saleContractProxy: string;

    @ApiProperty({ type: [CryptocurrencyDto] })
    allowedCryptocurrencies: CryptocurrencyDto[];

    @ApiProperty()
    marketPlaceFeeAddress: string;

    constructor(contract: ISaleContract) {
        this.saleContract = contract.saleContract;
        this.saleContractProxy = contract.saleContractProxy;
        this.allowedCryptocurrencies = contract.allowedCryptocurrencies.map(c => new CryptocurrencyDto(c));
        this.marketPlaceFeeAddress = contract.marketPlaceFeeAddress;
    }
}