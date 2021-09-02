import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { CollectiblesChooseType, CollectiblesSortType, StoreFrontCardStatus } from '../../types/enums';
import { HasMetadataDto } from '../../../dto/abstract/has-metadata.dto';
import { ExistCollectionsInStoreFront } from '../rules/exist-collections-in-store-front';
import { EntityIdDto } from '../../../dto/entity-id.dto';
import { ExistCardsInStoreFront } from '../rules/exist-cards-in-store-front';

export class BlockTextsType implements HasMetadataDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    headline: string;

    metadata = () => ({ name: 'string', headline: 'string' })
}

export class BlockCollectiblesType extends EntityIdDto implements HasMetadataDto {
    @ApiProperty()
    @IsEnum(CollectiblesChooseType)
    choose: CollectiblesChooseType;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    @ExistCollectionsInStoreFront()
    collections: string[];

    @ApiProperty()
    @IsOptional()
    @IsArray()
    @ExistCardsInStoreFront()
    cards: string[];

    @ApiProperty()
    @IsEnum(StoreFrontCardStatus)
    itemsType: StoreFrontCardStatus;

    @ApiProperty()
    @IsEnum(CollectiblesSortType)
    sort: CollectiblesSortType;

    metadata() {
        return {
            choose: Object.values(CollectiblesChooseType),
            cards: [],
            collections: [],
            itemsType: Object.values(StoreFrontCardStatus),
            sort: Object.values(CollectiblesSortType),
        }
    }
}

export class BlockSettingsType implements HasMetadataDto {
    @ApiProperty()
    @IsNotEmpty()
    backgroundColor: string;

    metadata = () => ({ backgroundColor: 'string' })
}

export class BlockCollectiblesSimpleType extends EntityIdDto implements HasMetadataDto {
    @ApiProperty()
    @IsArray()
    @ExistCollectionsInStoreFront()
    collections: string[];

    @ApiProperty()
    @IsNotEmpty()
    itemSize: string;

    metadata = () => ({
        collections: [],
        itemSize: 'string'
    })
}

export class BlockLinksType implements HasMetadataDto {
    @ApiProperty()
    @IsOptional()
    @IsUrl()
    @IsNotEmpty()
    website: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    twitter: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    telegram: string;

    @ApiProperty()
    @IsOptional()
    @IsNotEmpty()
    @IsUrl()
    discord: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    medium: string;

    metadata = () => ({
        website: 'string',
        twitter: 'string',
        telegram: 'string',
        discord: 'string',
        medium: 'string',
    })
}
