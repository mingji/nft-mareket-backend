import { ApiProperty } from '@nestjs/swagger';
import { INonceDocument } from '../schemas/nonce.schema';

export class NonceDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    nonce: number;

    constructor(nonce: Partial<INonceDocument>) {
        this.name = nonce.name;
        this.nonce = nonce.nonce;
    }
}
