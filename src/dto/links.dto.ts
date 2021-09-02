import { ApiProperty } from '@nestjs/swagger';
import { ILinks } from '../types/scheme';

export class LinksDto {
    @ApiProperty()
    website?: string;

    @ApiProperty()
    twitter?: string;

    @ApiProperty()
    medium?: string;

    @ApiProperty()
    telegram?: string;

    @ApiProperty()
    discord?: string;

    constructor(links: Partial<ILinks>) {
        this.website = links.website;
        this.twitter = links.twitter;
        this.medium = links.medium;
        this.telegram = links.telegram;
        this.discord = links.discord;
    }
}