import { ISignedUrl } from '../../utils/types/scheme';
import { IFilesSignedUrls } from '../types/scheme';

export class FilesSignedUrlsDto {
    [key: string]: ISignedUrl;

    constructor(data: IFilesSignedUrls) {
        Object.assign(this, data);
    }
}
