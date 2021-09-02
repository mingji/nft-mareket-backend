import {
    StoreFrontPageBlockAboutDto,
    StoreFrontPageBlockDigitalCollectionDto,
    StoreFrontPageBlockHeaderDto,
    StoreFrontPageBlockMostPopularDto,
    StoreFrontPageBlockSubscribeDto,
    StoreFrontPageBlockWhatIsDto
} from '../dto/store-front-page-blocks-settings.dto';
import { StoreFrontPageBlock } from './enums';

export const StoreFrontPageBlockSetting = {
    [StoreFrontPageBlock.HEADER]: StoreFrontPageBlockHeaderDto,
    [StoreFrontPageBlock.MOST_POPULAR]: StoreFrontPageBlockMostPopularDto,
    [StoreFrontPageBlock.DIGITAL_COLLECTION]: StoreFrontPageBlockDigitalCollectionDto,
    [StoreFrontPageBlock.WHAT_IS]: StoreFrontPageBlockWhatIsDto,
    [StoreFrontPageBlock.SUBSCRIBE]: StoreFrontPageBlockSubscribeDto,
    [StoreFrontPageBlock.ABOUT]: StoreFrontPageBlockAboutDto,
}