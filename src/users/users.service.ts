import { Injectable } from '@nestjs/common';
import { IUserDocument, IUserLeanDocument } from './schemas/user.schema';
import { UserDao } from './dao/user.dao';
import { MongooseService } from '../dao/mongoose/mongoose.service';
import { UserUpdateDto } from './dto/user-update.dto';
import { IS3File } from '../types/scheme';
import { v4 } from 'uuid';
import { UserError } from './errors/user.error';
import { Errors } from './types/errors';
import { StorageService } from '../utils/storage.service';
import { IFilesSignedUrls } from './types/scheme';

@Injectable()
export class UsersService extends MongooseService {
    constructor(
        private readonly userDao: UserDao,
        private readonly storageService: StorageService
    ) {
        super();
    }

    protected get dao(): UserDao {
        return this.userDao;
    }

    async findUserByEthAddress(ethAddress: string): Promise<IUserDocument | null> {
        return this.userDao.findUserByEthAddress(ethAddress);
    }

    async findUserBySlug(slug: string): Promise<IUserLeanDocument | IUserDocument | null> {
        if (!slug) {
            return null;
        }

        return this.userDao.findUserBySlug(slug);
    }

    async createUser(ethAddress: string): Promise<IUserDocument | null> {
        return this.userDao.createUser(ethAddress);
    }

    async findOrCreateUserByEthAddress(ethAddress: string): Promise<IUserDocument | null> {
        return await this.findUserByEthAddress(ethAddress) ?? await this.createUser(ethAddress);
    }

    async getUsersByEthAddresses(
        ethAddresses: string[]
    ): Promise<Array<IUserLeanDocument | IUserDocument | null>> {
        await this.userDao.syncUsers(ethAddresses);
        return this.userDao.getUsersByEthAddresses(ethAddresses, true);
    }

    async syncUsers(ethAddresses: string[]): Promise<void> {
        await this.userDao.syncUsers(ethAddresses);
    }

    async update(userId: string, data: UserUpdateDto, avatar?: IS3File): Promise<void> {
        const updateData = avatar ? { ...data, avatar } : data;
        return this.userDao.updateUserById(userId, updateData);
    }

    getSignedUrls(
        userId: string,
        fileNames: string[]
    ): IFilesSignedUrls {
        if (!fileNames.length) {
            throw new UserError(Errors.EMPTY_FILE_NAMES);
        }

        const res = {};
        [...new Set(fileNames)].forEach(fileName => {
            const time = new Date().getTime();
            const key = `${userId}/${time}/${v4()}/${v4()}/${fileName}`;
            res[fileName] = this.storageService.getSignedUrl(key);
        });

        return res;
    }
}
