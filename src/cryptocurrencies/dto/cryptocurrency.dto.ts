import { ApiProperty } from '@nestjs/swagger';
import { ICryptocurrencyDocument } from '../schemas/cryptocurrency.schema';

export class CryptocurrencyDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    symbol: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    slug: string;

    @ApiProperty()
    tokenAddress: string;

    constructor(cryptocurrency: Partial<ICryptocurrencyDocument>) {
        this.id = cryptocurrency.id;
        this.symbol = cryptocurrency.symbol;
        this.name = cryptocurrency.name;
        this.name = cryptocurrency.name;
        this.slug = cryptocurrency.slug;
        this.tokenAddress = cryptocurrency.tokenAddress;
    }
}
