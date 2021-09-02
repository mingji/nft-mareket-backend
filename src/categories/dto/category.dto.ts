import { ApiProperty } from "@nestjs/swagger";
import { TLocalesDictionary } from "src/types/common";
import { ICategoryLeanDocument } from "../schemas/categories.schema";
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { ToS3FilePublic } from '../../decorators/to-s3-file-public.decorator';
import { S3FilePublicDto } from '../../dto/s3-file-public.dto';
import { TokenCollectionShortDto } from '../../tokenCollections/dto/response/token-collection-short.dto';

export class CategoryDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ type: S3FilePublicDto })
    @ToS3FilePublic()
    icon: S3FilePublicDto;

    @ApiProperty()
    title: TLocalesDictionary;

    @ApiProperty()
    description: TLocalesDictionary;
    
    @ApiProperty()
    parentId: string;
    
    @ApiProperty()
    order: number;
    
    @ApiProperty()
    isTopCategory: boolean;
    
    @ApiProperty()
    createdAt: Date;

    @ApiProperty({ type: [TokenCollectionShortDto] })
    topCollections: TokenCollectionShortDto[];

    constructor (category: ICategoryLeanDocument) {
        const topCollections = (category.tokenCollections || []) as ITokenCollectionDocument[];
        this.id = category.id;
        this.icon = category.icon;
        this.title = category.title;
        this.description = category.description;
        this.parentId = category.parentId;
        this.order = category.order;
        this.isTopCategory = category.isTopCategory;
        this.createdAt = category.createdAt;
        this.topCollections = topCollections.map(collection => new TokenCollectionShortDto(collection));
    }
}