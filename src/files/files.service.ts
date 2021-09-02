import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { IS3File } from '../types/scheme';
import { Errors } from '../types/errors';
import { HTTP_SERVICE, HttpService } from '../utils/http.service';
import { StorageService } from '../utils/storage.service';
import { UtilsService } from '../utils/utils.service';
import { IpfsService } from '../utils/ipfs.service';

@Injectable()
export class FilesService {
    @Inject(HTTP_SERVICE) private httpService: HttpService

    @Inject(forwardRef(() => StorageService)) private readonly storageService: StorageService

    constructor(
        private readonly utilsService: UtilsService,
        private readonly ipfsService: IpfsService
    ) {}

    async storeFileFromUrl(fileUrl: string, path: string): Promise<IS3File> {
        const buffer = await this.getFileBufferByUrl(fileUrl);

        if (!buffer) {
            throw new InternalServerErrorException(Errors.WRONG_IMAGE_BUFFER);
        }

        return this.storageService.save(path, buffer);
    }

    async getFileBufferByUrl(url: string): Promise<Buffer | ArrayBuffer | null> {
        if (!this.utilsService.isValidURI(url)) {
            return null;
        }

        if (this.utilsService.isIPFSURI(url)) {
            const res = await this.ipfsService.request(url);
            try {
                return res[0].content;
            } catch(e) {
                return null;
            }
        }

        if (this.utilsService.isLinkURI(url)) {
            return await this.httpService.getFileBufferFromUrl(url);
        }

        return null;
    }

    getFileExtensionFromUrl(path): string | undefined {
        return /(?:\.([^.]+))?$/.exec(path)[1];
    }
}
