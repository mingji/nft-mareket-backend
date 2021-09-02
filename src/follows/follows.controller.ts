import {
    BadRequestException,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Request,
    SerializeOptions,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { UsersService } from '../users/users.service';
import { IUserDocument } from '../users/schemas/user.schema';
import { Errors } from './types/errors';
import { FollowsService } from './follows.service';
import { FollowListQueryDto } from './dto/request/follow-list-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { CardBlockDto } from '../cards/dto/card-block.dto';
import { UserDto } from '../users/dto/user.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { FollowDto } from './dto/response/follow.dto';
import { IFollowLeanDocument } from './schemas/follows.schema';
import { FollowTypeParamDto } from './dto/request/follow-type-param.dto';

@ApiTags('Follows')
@ApiExtraModels(PaginatedResponseDto, UserDto)
@Controller()
export class FollowsController {
    constructor(private readonly followsService: FollowsService) {}

    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @ApiCreatedResponse()
    @UseGuards(JwtAuthGuard)
    @Post('follows/users/:userId')
    async follow(
        @Request() req,
        @Param('userId', EntityByIdPipe(UsersService)) followUser: IUserDocument
    ): Promise<void> {
        if (await this.followsService.existFollow(req.user.id, followUser.id)) {
            throw new BadRequestException(Errors.FOLLOW_EXISTS);
        }

        await this.followsService.storeNewFollow(req.user.id, followUser.id);
    }

    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiNotFoundResponse()
    @ApiOkResponse()
    @UseGuards(JwtAuthGuard)
    @Delete('follows/users/:userId')
    async unfollow(
        @Request() req,
        @Param('userId', EntityByIdPipe(UsersService)) followUser: IUserDocument
    ): Promise<void> {
        if (!await this.followsService.existFollow(req.user.id, followUser.id)) {
            throw new BadRequestException(Errors.FOLLOW_DOES_NOT_EXISTS);
        }

        await this.followsService.removeFollow(req.user.id, followUser.id);
    }

    @ApiPaginatedResponse(CardBlockDto)
    @ApiNotFoundResponse()
    @ApiBadRequestResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get('users/:userId/:type')
    async getFollows(
        @Param('userId', EntityByIdPipe(UsersService)) user: IUserDocument,
        @Param() { type }: FollowTypeParamDto,
        @Query() query: FollowListQueryDto
    ): Promise<PaginatedResponseDto<FollowDto, IFollowLeanDocument>> {
        const data = await this.followsService.getFollowsByTypeAndUserId(
            type,
            user.id,
            query
        );

        return new PaginatedResponseDto<FollowDto, IFollowLeanDocument>(data, FollowDto, type);
    }
}
