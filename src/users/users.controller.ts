import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Request,
    SerializeOptions,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '../utils/file-upload.utils';
import { StorageService } from '../utils/storage.service';
import { UserUpdateDto } from './dto/user-update.dto';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';
import { Errors } from './types/errors';
import { IUserDocument } from './schemas/user.schema';
import { EntityByIdPipe } from '../pipes/entity-by-id.pipe';
import { ReportMessageDto } from '../dto/report.dto';
import { IHtmlData } from '../mailer/types/scheme';
import { MailService } from '../mailer/mail.service';
import { getMailSubject, Subjects } from '../config';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(
        private readonly storageService: StorageService,
        private readonly usersService: UsersService,
        private readonly mailService: MailService
    ) {
    }

    @ApiOkResponse({ type: UserDto })
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get(':id')
    getUser(@Param('id', EntityByIdPipe(UsersService)) requestUser: IUserDocument,) {
        return new UserDto(requestUser);
    }

    @ApiOkResponse({ type: UserDto })
    @ApiBadRequestResponse()
    @ApiUnauthorizedResponse()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @UseInterceptors(FileInterceptor(
        'avatar',
        { fileFilter: imageFileFilter })
    )
    @Put(':id')
    async update(
        @Request() req,
        @Param('id', EntityByIdPipe(UsersService)) requestUser: IUserDocument,
        @UploadedFile() avatar: Express.Multer.File,
        @Body() userUpdateDto: UserUpdateDto
    ) {
        if (requestUser.id !== req.user.id) {
            throw new NotFoundException();
        }
        const existsUserWithSlug = await this.usersService.findUserBySlug(userUpdateDto.slug);

        if (existsUserWithSlug && existsUserWithSlug.id !== requestUser.id) {
            throw new BadRequestException(Errors.USER_WITH_SLUG_EXISTS);
        }

        const avatarOnS3 = avatar ? await this.storageService.upload(avatar, req.user.id) : null;

        await this.usersService.update(requestUser.id, userUpdateDto, avatarOnS3);
        const user = await this.usersService.getById<IUserDocument>(requestUser.id);
        return new UserDto(user);
    }

    @ApiOkResponse()
    @ApiBadRequestResponse()
    @UseGuards(JwtAuthGuard)
    @Post('/:userId/report')
    async reportUser(
        @Request() req,
        @Body() body: ReportMessageDto,
        @Param('userId') userId: string,
    ): Promise<void> {
        const subject = getMailSubject(Subjects.user, userId);
        const htmlData: IHtmlData = { walletAddress: req.user.walletAddress, message: body.message, link: body.link };
        await this.mailService.sendMail(body.email, subject, htmlData)
    }
}
