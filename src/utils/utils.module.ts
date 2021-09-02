import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { UtilsService } from "./utils.service";
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';
import { HTTP_SERVICE, HttpService } from './http.service';
import { S3Module } from 'nestjs-s3';
import { IpfsService } from './ipfs.service';
import { FilesModule } from '../files/files.module';

const providers = [
    UtilsService,
    StorageService,
    { provide: HTTP_SERVICE, useClass: HttpService },
    IpfsService
];

@Module({
    imports: [ConfigModule, S3Module, HttpModule, forwardRef(() => FilesModule)],
    providers: [...providers],
    exports: [...providers, FilesModule]
})
export class UtilsModule {}