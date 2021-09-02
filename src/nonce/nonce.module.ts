import { Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import nonceDaoOptions from '../nonce/dao/options/nonce.dao.options';
import { NonceController } from './nonce.controller';
import { NonceService } from './nonce.service';

@Module({
    imports: [DaoModule.forFeature(nonceDaoOptions)],
    controllers: [NonceController],
    providers: [NonceService],
    exports: [NonceService]
})
export class NonceModule {}
