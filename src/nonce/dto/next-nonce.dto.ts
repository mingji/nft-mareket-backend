import { ApiProperty } from '@nestjs/swagger';

export class NextNonceDto {
    @ApiProperty()
    nonce: number;

    constructor(nonce: number) {
        this.nonce = nonce;
    }
}
