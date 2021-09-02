import { ApiProperty } from '@nestjs/swagger';

class Type {
    @ApiProperty()
    name: string;

    @ApiProperty()
    type: string;
}

class Types {
    @ApiProperty({ type: [Type] })
    EIP712Domain: Array<Type>;
    @ApiProperty({ type: [Type] })
    Person: Array<Type>;
    @ApiProperty({ type: [Type] })
    Mail: Array<Type>;
}

class Domain {
    @ApiProperty()
    name: string;
    @ApiProperty()
    version: string;
    @ApiProperty()
    chainId: number;
    @ApiProperty()
    verifyingContract: string;
    @ApiProperty()
    salt: string;
}

class Message {
    @ApiProperty()
    contents: string;
}

export class SignTypeDataArkane_v3Dto {
    @ApiProperty({ type: Types })
    types: Types;

    @ApiProperty()
    primaryType: string;

    @ApiProperty({ type: Domain })
    domain: Domain;

    @ApiProperty({ type: Message })
    message: Message;

    constructor(data: SignTypeDataArkane_v3Dto) {
        Object.assign(this, data);
    }
}