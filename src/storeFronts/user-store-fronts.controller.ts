import {
    ClassSerializerInterceptor,
    Controller,
    Param,
    Request,
    UseGuards,
    UseInterceptors,
    NotFoundException,
    Get,
    SerializeOptions,
    Query
} from '@nestjs/common';
import {
    ApiTags,
    ApiUnauthorizedResponse,
    ApiBearerAuth,
    ApiExtraModels,
    ApiBadRequestResponse
} from '@nestjs/swagger';
import { StoreFrontsService } from './store-fronts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IUserDocument } from '../users/schemas/user.schema';
import { StoreFrontDto } from './dto/store-front.dto';
import { PaginatedRequestDto } from '../dto/paginated-request.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { IStoreFrontDocument } from './schemas/store-fronts.schema';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { UsersService } from '../users/users.service';

@ApiTags('users/:id/store-fronts')
@ApiExtraModels(PaginatedResponseDto, StoreFrontDto)
@Controller('users/:id/store-fronts')
export class UserStoreFrontsController {
    constructor(
        private readonly storeFrontsService: StoreFrontsService,
    ) {}

    @ApiBearerAuth()
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @ApiPaginatedResponse(StoreFrontDto)
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @UseGuards(JwtAuthGuard)
    @Get('')
    async getUserStoreFronts(
        @Request() req,
        @Param('id', EntityByIdPipe(UsersService)) requestUser: IUserDocument,
        @Query() query: PaginatedRequestDto
    ): Promise<PaginatedResponseDto<StoreFrontDto, IStoreFrontDocument>> {
        if (requestUser.id !== req.user.id) {
            throw new NotFoundException();
        }

        const data = await this.storeFrontsService.getStoreFrontsByUserId(req.user.id, query);

        return new PaginatedResponseDto<StoreFrontDto, IStoreFrontDocument>(data, StoreFrontDto);
    }
}
