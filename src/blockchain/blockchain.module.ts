import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EthereumWyvernExchangeSaleContractService } from './sale-contract/impl/ethereum.wyvern-exchange.sale-contract.service';
import { MaticWyvernExchangeSaleContractService } from './sale-contract/impl/matic.wyvern-exchange.sale-contract.service';
import { BlockchainService } from './blockchain.service';
import { EthereumWeb3Service } from './web3/ethereum.web3.service';
import { MaticWeb3Service } from './web3/matic.web3.service';

@Module({
    imports: [ConfigModule],
    providers: [
        EthereumWeb3Service,
        MaticWeb3Service,
        EthereumWyvernExchangeSaleContractService,
        MaticWyvernExchangeSaleContractService,
        BlockchainService
    ],
    exports: [
        BlockchainService
    ]
})
export class BlockchainModule {}
