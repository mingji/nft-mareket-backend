import { ApiProperty } from '@nestjs/swagger';
import { IUserDocument } from '../schemas/user.schema';
import { S3FilePublicDto } from '../../dto/s3-file-public.dto';
import { LinksDto } from '../../dto/links.dto';
import { ToId } from '../../decorators/to-id.decorator';
import { ToS3FilePublic } from '../../decorators/to-s3-file-public.decorator';
import { ObjectID } from 'mongodb';

export class UserDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    ethAddress: string;

    @ApiProperty()
    verified: boolean;

    @ApiProperty()
    description: string;

    @ApiProperty()
    slug: string;

    @ApiProperty( { type: LinksDto } )
    links?: LinksDto;

    @ApiProperty({ type: S3FilePublicDto })
    @ToS3FilePublic()
    avatar: S3FilePublicDto;

    @ApiProperty()
    countFollowers?: number;

    constructor(user: Partial<IUserDocument>) {
        if (user instanceof ObjectID) {
            user = { id: user.toString() }
        }

        if (typeof user === 'string') {
            user = { id: user }
        }

        this.id = user.id ?? user._id.toString();
        this.name = user.name;
        this.ethAddress = user.ethAddress;
        this.verified = user.verified;
        this.description = user.description;
        this.slug = user.slug;
        this.links = user.links ? new LinksDto(user.links) : undefined;
        this.avatar = user.avatar;
        this.countFollowers = user.countFollowers as number;
    }
}
