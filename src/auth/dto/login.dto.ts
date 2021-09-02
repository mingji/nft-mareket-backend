import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    userId: string;

    constructor(data: LoginDto) {
        this.accessToken = data.accessToken;
        this.userId = data.userId;
    }
}
