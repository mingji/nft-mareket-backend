import { ApiProperty } from '@nestjs/swagger';
import { ToId } from '../../decorators/to-id.decorator';
import { UserDto } from '../../users/dto/user.dto';
import { IStoreFrontDocument } from '../schemas/store-fronts.schema';
import { IUserDocument } from '../../users/schemas/user.schema';
import { S3FilePublicDto } from '../../dto/s3-file-public.dto';

export class StoreFrontDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({type: S3FilePublicDto})
    logo: S3FilePublicDto;

    @ApiProperty({ type: UserDto })
    owner: UserDto;

    @ApiProperty()
    slug: string;

    @ApiProperty()
    fee: number;

    @ApiProperty()
    payoutAddress: string;

    @ApiProperty()
    paymentTokens: string[];

    constructor(storeFront: Partial<IStoreFrontDocument>) {
        this.id = storeFront.id;
        this.name = storeFront.name;
        this.owner = new UserDto(storeFront.owner as IUserDocument);
        this.logo = storeFront.logo ? new S3FilePublicDto(storeFront.logo) : null;
        this.slug = storeFront.slug ?? '';
        this.fee = storeFront.fee ?? 0;
        this.payoutAddress = storeFront.payoutAddress ?? '';
        this.paymentTokens = storeFront.paymentTokens ?? [];
    }
}
