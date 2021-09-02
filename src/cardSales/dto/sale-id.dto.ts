import { IsMongoId } from 'class-validator';

export class SaleIdDto {
    @IsMongoId()
    saleId: string;
}
