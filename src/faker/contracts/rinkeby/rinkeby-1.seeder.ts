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
        contractId: '0x528b1f763442c9260f0be8908047f75dd7c7d242',
        contractCreator: '0x910266349a2aaca44ce909b6845e8c1ab75f475e',
        contractName: 'Rinkeby-1',
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
        const [ defaultMetadata ] = metadata.splice(Math.floor(Math.random() * metadata.length), 1);
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
