import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Network } from '../../config/types/constants';

export class CryptocurrenciesQueryDto {
    @ApiProperty({ required: true, enum: Object.values(Network) })
    @IsNotEmpty()
    @IsString()
    @IsIn(Object.values(Network))
    network: Network;
}
