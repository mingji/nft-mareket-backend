export enum EIP {
    EIP_1155 = 'EIP-1155',
    EIP_721 = 'EIP-721'
}

export enum Network {
    ETHEREUM = 'ethereum',
    MATIC = 'matic'
}

export class Pagination {
    static readonly ITEMS_PER_PAGE: number = 20;
    static readonly MAX_ITEMS_PER_PAGE: number = 50;
}

export class Blockchain {
    static readonly COUNT_PROCESSED_BLOCK_PER_JOB_MATIC: number = 30;
    static readonly COUNT_PROCESSED_BLOCK_PER_JOB_ETHEREUM: number = 5;
}

export class ExternalAuth {
    static readonly TOKEN_ALLOWED_MINUTES: number = 2;
}
