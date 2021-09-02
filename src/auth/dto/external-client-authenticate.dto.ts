import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExternalAuth } from '../../config/types/constants';
import { MinTimestamp } from '../../decorators/validations/min-timestamp';
import { MaxTimestamp } from '../../decorators/validations/max-timestamp';

export class ExternalClientAuthenticateDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    clientId: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    @MinTimestamp({ date: () => new Date() })
    @MaxTimestamp({
        date: () => new Date(new Date().getTime() - ExternalAuth.TOKEN_ALLOWED_MINUTES * 60000)
    })
    time: string;
}
