import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { TokenCollectionsModule } from '../tokenCollections/token-collections.module';
import { CardsModule } from '../cards/cards.module';

@Module({
    imports: [TokenCollectionsModule, CardsModule],
    controllers: [SearchController],
    providers: [SearchService],
    exports: [SearchService]
})
export class SearchModule {}
