import { Test } from '@nestjs/testing';
import * as faker from 'faker';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomEipToken } from '../../../test/lib';
import { IEipToken } from '../../subgraph/types/eip';
import { DaoModelNames } from '../../types/constants';
import { ITokenCollectionDocument } from '../../tokenCollections/schemas/token-collection.schema';
import { AppModule } from '../../app.module';
import { StorageService } from '../../utils/storage.service';
import { SubgraphService } from '../../subgraph/subgraph.service';
import { HTTP_SERVICE } from '../../utils/http.service';
import { TokenCollectionsService } from '../../tokenCollections/token-collections.service';
import { EIP, Network } from '../../config/types/constants';

const storageService = {
    save: () => ({
        provider: 's3',
        key: 'key',
        location: faker.image.imageUrl(),
        etag: 'etag',
        bucket: 'bucket',
        mimetype: 'image/png',
        extension: 'png'
    }),
    removeMany: () => true
};

const subgraphService = {
    getTokenWithMetadataListFetch: async (eipVersion: EIP, contractId: string) => [randomEipToken(contractId)],
    getAllBalancesByToken: async (token: IEipToken) =>  token.balances
};

const httpService = {
    getFileBufferFromUrl: () => Promise.resolve(new IncomingMessage(new Socket()))
};

class TokenCollectionDao {
    @InjectModel(DaoModelNames.tokenCollection)
    private readonly tokenCollectionModel: Model<ITokenCollectionDocument>;

    createCollection(
        contractId: string,
        userId: string,
        name: string,
        symbol: string
    ) {
        return this.tokenCollectionModel.create(
            {
                contractId: JSON.parse(contractId).contractId.toLowerCase(),
                userId,
                name,
                symbol
            }
        );
    }
    findCollectionByContractId(contractId: string) {
        return this.tokenCollectionModel.findOne(
            { contractId: JSON.parse(contractId).contractId.toLowerCase() }
        );
    }
}

const contracts = [
    {
        contractId: '{' +
            '"contractId": "1xfa35c543e8C3F125e164D2fB07C587c2895700Bd",' +
            '"contractCreator": "0xfa35c543e8C3F125e164D2fB07C587c2895700Bd"' +
            '}',
        contractCreator: '0xfa35c543e8C3F125e164D2fB07C587c2895700Bd',
        contractName: faker.commerce.productName(),
        version: EIP.EIP_1155,
    },
    {
        contractId: '{' +
            '"contractId": "1xb1b4803d160db4343c94adc26629a4cd07a373f1",' +
            '"contractCreator": "0xb1b4803d160db4343c94adc26629a4cd07a373f1"' +
            '}',
        contractCreator: '0xb1b4803d160db4343c94adc26629a4cd07a373f1',
        contractName: faker.commerce.productName(),
        version: EIP.EIP_1155,
    },
];

async function bootstrap() {
    const app = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(StorageService).useValue(storageService)
        .overrideProvider(SubgraphService).useValue(subgraphService)
        .overrideProvider(HTTP_SERVICE).useValue(httpService)
        .overrideProvider(TokenCollectionDao).useClass(TokenCollectionDao)
        .compile();

    for (const index in contracts) {
        const contract = contracts[index];
        await app.get(TokenCollectionsService).syncContract(
            Network.ETHEREUM,
            contract.contractId,
            contract.contractCreator,
            contract.contractName,
            contract.version
        );
    }

    await app.close();
}

bootstrap().catch(reason => {
    console.log(`Error on contract seed:`, reason);
    process.exit(1);
});
