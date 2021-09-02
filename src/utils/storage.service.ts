import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectS3, S3 } from 'nestjs-s3';
import * as AWS from 'aws-sdk';
import { IS3File } from '../types/scheme';
import { ConfigService } from '@nestjs/config';
import { IS3Config } from '../config';
import { DeleteObjectOutput } from 'aws-sdk/clients/s3';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import * as FileType from 'file-type';
import { FilesService } from '../files/files.service';
import { FileError } from '../files/files/file.error';
import { Errors } from '../files/types/errors';
import { ISignedUrl } from './types/scheme';

@Injectable()
export class StorageService {
    @InjectS3()
    private readonly s3: S3;

    private readonly bucketPublic: string;

    private readonly bucketFrontend: string;

    static readonly SIGNED_URL_EXPIRES_SECONDS: number = 60;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => FilesService)) private readonly filesService: FilesService
    ) {
        const { bucketPublic, bucketFrontend } = this.configService.get<IS3Config>('storage.s3');
        this.bucketPublic = bucketPublic;
        this.bucketFrontend = bucketFrontend;
    }

    async readFile(
        key: string,
        bucket?: string
    ): Promise<Buffer> {
        let res: AWS.S3.Types.GetObjectOutput;

        try {
            res = await this.s3
                .getObject({
                    Bucket: bucket || this.bucketPublic,
                    Key: key
                })
                .promise();
        } catch (error) {
            if (error.statusCode === HttpStatus.NOT_FOUND) {
                throw new FileError(Errors.FILE_DOES_NOT_EXIST);
            }
            throw error;
        }

        if (!Buffer.isBuffer(res.Body)) {
            throw new FileError(Errors.FILE_DOES_NOT_EXIST);
        }

        return res.Body;
    }

    /**
     * Uploading file to s3 from multer
     * @param file Express.Multer.File file object from FileInterceptor
     * @param prefix prefix for creating subfolder, for example userId to save all user files to subfolder
     * @param key file name if null it will be generated randomly
     */
    async upload(file: Express.Multer.File, prefix: string, key?: string | null): Promise<IS3File | null> {
        if (!file) {
            return;
        }
        const path = `${prefix}/${key || randomStringGenerator()}.${
            this.filesService.getFileExtensionFromUrl(file.originalname)
        }`;
        return this.save(
            path,
            file.buffer
        );
    }

    async save(
        path: string,
        data: Buffer|Uint8Array|ArrayBuffer,
        bucket?: string
    ): Promise<IS3File> {
        const { ext: extension, mime: mimetype } = await FileType.fromBuffer(data) || {};

        const pathExt = this.filesService.getFileExtensionFromUrl(path);
        if (!pathExt && extension) {
            path += `.${extension}`;
        }

        const params: AWS.S3.Types.PutObjectRequest = {
            Bucket: bucket || this.bucketPublic,
            Key: path,
            Body: data
        };

        const res = await this.s3.upload(params).promise();

        return {
            provider: 's3',
            key: res.Key,
            location: res.Location,
            etag: res.ETag,
            bucket: res.Bucket,
            extension,
            mimetype,
        };
    }

    async remove(file: { bucket: string, key: string }): Promise<DeleteObjectOutput> {
        return this.s3.deleteObject({ Bucket: file.bucket, Key: file.key }).promise();
    }

    async removeMany(files: Array<{ bucket: string, key: string }>): Promise<void> {
        const buckets: { [key in string]: string[] } = {};

        files.forEach(file => {
            if (!buckets[file.bucket]) {
                buckets[file.bucket] = [];
            }
            buckets[file.bucket].push(file.key);
        });

        await Promise.all(Object.keys(buckets).map(bucket => {
            return this.s3.deleteObjects({
                Bucket: bucket,
                Delete: { Objects: buckets[bucket].map(key => ({ Key: key })) }
            }).promise();
        }));
    }

    getSignedUrl(
        key: string,
        operation = 'putObject',
        expires = StorageService.SIGNED_URL_EXPIRES_SECONDS
    ): ISignedUrl {
        const url = this.s3.getSignedUrl(
            operation,
            {
                Bucket: this.bucketFrontend,
                Key: key,
                Expires: expires,
                ContentType: 'application/octet-stream'
            }
        );

        return {
            url,
            key,
            bucket: this.bucketFrontend,
        };
    }
}
