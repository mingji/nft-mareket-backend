import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IS3Config } from '../config';
import { S3ModuleOptions, S3ModuleOptionsFactory } from 'nestjs-s3/dist/s3.interfaces';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3OptionsService implements S3ModuleOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createS3ModuleOptions(): S3ModuleOptions {
        const { accessKeyId, secretAccessKey, endpoint } = this.configService.get<IS3Config>('storage.s3');

        const config: AWS.S3.ClientConfiguration = {
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        };

        if (accessKeyId && secretAccessKey) {
            config.accessKeyId = accessKeyId;
            config.secretAccessKey = secretAccessKey;
        }

        if (endpoint) {
            config.endpoint = endpoint;
        }

        return { config };
    }
}
