import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

class TypeDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    type: string;
}

class TypesDto {
    @ApiProperty({ type: [TypeDto] })
    EIP712Domain: TypeDto[];

    @ApiProperty({ type: [TypeDto] })
    Message: TypeDto[];
}

export class CreateSaleSignDomainDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
}

export class CreateSaleSignMessageDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    contents: string;
}

export class SignCreateSaleDto {
    @ApiProperty({ type: TypesDto })
    types: TypesDto;

    @ApiProperty()
    primaryType: string;

    @ApiProperty({ type: CreateSaleSignDomainDto })
    domain: CreateSaleSignDomainDto;

    @ApiProperty({ type: CreateSaleSignMessageDto })
    message: CreateSaleSignMessageDto;

    @ApiProperty({ required: false })
    name: string;

    @ApiProperty({ required: false })
    value: string;

    @ApiProperty({ required: false })
    type: string;

    constructor(signature: Partial<SignCreateSaleDto>) {
        Object.assign(this, signature);
    }
}