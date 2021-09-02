export interface ISignTypeData_v3 {
    types: {
        EIP712Domain: Array<any>;
        Person: Array<any>;
        Mail: Array<any>;
    };
    primaryType: string;
    domain: {
        name: string;
        version: string;
        reqId: string;
    };
    message: {
        contents: string;
    };
}

export enum WalletType {
    Arkane = 'arkane',
    Metamask = 'metamask',
}

export const SignatureReqIdField = {
    [WalletType.Arkane]: 'salt',
    [WalletType.Metamask]: 'reqId'
}