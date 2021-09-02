import { ApiProperty } from '@nestjs/swagger';
import { IPaginatedList } from '../types/common';

export class PaginatedResponseDto<DTO, DOCUMENT> {
    data: Array<DTO>;

    @ApiProperty()
    total: number;

    @ApiProperty({ required: false })
    offset?: number;

    @ApiProperty({ required: false })
    limit?: number;

    constructor(
        { data, total, offset, limit }: IPaginatedList<DOCUMENT>,
        dto: new (item: DOCUMENT, ...rest) => DTO,
        ...rest
    ) {
        this.data = data.map((item: DOCUMENT) => new dto(item, ...rest));
        this.total = total;
        this.offset = offset || 0;
        this.limit = limit || 0;
    }
}
