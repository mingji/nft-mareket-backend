import { Injectable } from '@nestjs/common';
import { SearchDto } from './dto/request/search.dto';
import { CardsService } from '../cards/cards.service';
import { TokenCollectionsService } from '../tokenCollections/token-collections.service';
import { ISearchRes } from './types/scheme';

@Injectable()
export class SearchService {
    constructor(
        private readonly cardsService: CardsService,
        private readonly tokenCollectionsService: TokenCollectionsService
    ) {}

    static readonly SEARCH_LIMIT: number = 10;

    async search({ name }: SearchDto): Promise<ISearchRes> {
        const cards = await this.cardsService.getCardsByName(
            name,
            SearchService.SEARCH_LIMIT,
            true
        );
        const collections = await this.tokenCollectionsService.getCollectionsByName(
            name,
            SearchService.SEARCH_LIMIT,
            true
        );

        return { collections, cards };
    }
}
