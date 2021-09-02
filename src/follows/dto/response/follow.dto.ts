import { ApiProperty } from '@nestjs/swagger';
import { ToId } from '../../../decorators/to-id.decorator';
import { UserDto } from '../../../users/dto/user.dto';
import { FollowTypeRefField, IFollowLeanDocument } from '../../schemas/follows.schema';
import { FollowType } from '../../types/enums';
import { IUserLeanDocument } from '../../../users/schemas/user.schema';

export class FollowDto {
    @ApiProperty()
    @ToId()
    id: string;

    @ApiProperty({ type: UserDto })
    user: UserDto;

    constructor(follow: IFollowLeanDocument, type: FollowType) {
        this.id = follow.id;
        this.user = new UserDto(follow[FollowTypeRefField[type]] as IUserLeanDocument);
    }
}
