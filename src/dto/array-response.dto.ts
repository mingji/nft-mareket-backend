import { ApiProperty } from '@nestjs/swagger';

export class ArrayResponseDto<DTO, DOCUMENT> {
    data: Array<DTO>;

    @ApiProperty()
    total: number;

    constructor(
        data: DOCUMENT[],
        dto: new (item: DOCUMENT) => DTO
    ) {
        this.data = data.map((item: DOCUMENT) => new dto(item));
        this.total = data.length;
    }
}
