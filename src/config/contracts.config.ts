import { registerAs } from '@nestjs/config';
import { EIP } from './types/constants';

export interface IContractConfig {
    contractId: string;
    contractCreator: string;
    contractName: string;
    version: EIP;
}

export interface IContractsConfig {
    contracts: IContractConfig[];
}

export const getContractById = (contractId: string): IContractConfig | null => {
    const contract: IContractConfig = contractsConfig()
        .contracts
        .find(contract => contract.contractId.toLowerCase() === contractId.toLowerCase());

    if (!contract) {
        return null;
    }

    if (!isCorrectContract(contract)) {
        return null;
    }

    return {
        ...contract,
        contractId: contract.contractId.toLowerCase(),
        contractCreator: contract.contractCreator.toLowerCase()
    };
}

const isCorrectContract = (contract: IContractConfig) => {
    const { contractId, contractName, contractCreator, version } = contract;
    return contractId && contractCreator && contractName && version;
}

export const contractsConfig = registerAs('contracts', () => ({
    contracts: JSON.parse(process.env.CONTRACTS || '') || [],
}));
