import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { UtilsModule } from '../utils/utils.module';

@Module({
    imports: [forwardRef(() => UtilsModule)],
    providers: [FilesService],
    exports: [FilesService]
})
export class FilesModule {}