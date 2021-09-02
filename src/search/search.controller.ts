import { ClassSerializerInterceptor, Controller, Get, Query, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SearchDto as SearchRequestDto } from './dto/request/search.dto';
import { SearchDto as SearchResponseDto } from './dto/response/search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @ApiOkResponse({ type: SearchResponseDto })
    @ApiBadRequestResponse()
    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ excludePrefixes: ['_'] })
    @Get()
    async index(@Query() searchRequest: SearchRequestDto): Promise<SearchResponseDto> {
        const { collections, cards } = await this.searchService.search(searchRequest);
        return new SearchResponseDto(collections, cards);
    }
}
