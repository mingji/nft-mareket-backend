import { Module } from '@nestjs/common';
import { DaoModule } from '../dao/dao.module';
import cardViewerDaoOptions from './dao/options/card-viewer.dao.options';
import { CardViewersService } from './card-viewers.service';

@Module({
    imports: [DaoModule.forFeature(cardViewerDaoOptions)],
    providers: [CardViewersService],
    exports: [CardViewersService]
})
export class CardViewersModule {}
