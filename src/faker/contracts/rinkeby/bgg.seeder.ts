import { NestFactory } from '@nestjs/core';
import * as winston from 'winston';
import { WinstonOptionsService } from '../../../logger/winston-options.service';
import { AppModule } from '../../../app.module';
import { InternalServerErrorException } from '@nestjs/common';
import { Errors } from '../../../types/errors';
import { SubgraphService } from '../../../subgraph/subgraph.service';
import { CardsService } from '../../../cards/cards.service';
import * as metadata from '../data/bccg-metadata.json';
import { TokenCollectionsService } from '../../../tokenCollections/token-collections.service';
import { EIP, Network } from '../../../config/types/constants';
import { v4 } from 'uuid';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on contract seed (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on contract seed (uncaughtException):`, reason);
});

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const network = Network.ETHEREUM;
    const contract = {
        contractId: '0xe96493f7c7107705ab38bbf9ad23906f4d922ad9',
        contractCreator: '0xFB8a9Af105eA5FbE294C7Abf020AF8e287f27Bc1',
        contractName: 'BGG',
        version: EIP.EIP_1155
    };

    const subgraphService = app.get(SubgraphService);
    const tokens = await subgraphService.getTokenWithMetadataListFetch(
        Network.ETHEREUM,
        contract.version,
        contract.contractId
    );

    if (!tokens.length) {
        throw new InternalServerErrorException(Errors.EIP_CONTRACT_FETCH_EMPTY_DATA);
    }

    const tokenCollectionsService = app.get(TokenCollectionsService);
    const contractInstance = await tokenCollectionsService.findOrCreateCollectionByContractId(
        network,
        contract.contractId,
        contract.contractCreator,
        contract.contractName
    );

    if (!contractInstance) {
        throw new InternalServerErrorException(Errors.UNDEFINED_TOKEN_COLLECTION_INSTANCE);
    }

    const cardsService = app.get(CardsService);
    await Promise.all(tokens.map(token => {
        const [ defaultMetadata ] = metadata.splice(0, 1);
        defaultMetadata.name += ` ${v4()}`;
        return cardsService.syncCard(contractInstance, token, defaultMetadata);
    }));

    const unusedCards = await cardsService.getUnusedCardsByCollection(
        contractInstance.id,
        tokens.map(token => token.token)
    );

    await cardsService.deleteCards(unusedCards);

    await app.close();
}

bootstrap().catch(reason => {
    console.log(`Error on contract seed:`, reason);
    process.exit(1);
});
