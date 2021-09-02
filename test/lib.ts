import { ContextId } from '@nestjs/core/injector/instance-wrapper';
import { APP_FILTER, ContextIdFactory } from '@nestjs/core';
import { Connection } from 'mongoose';
import { DaoIds, Nonce } from '../src/types/constants';
import {
    appConfig,
    authConfig,
    blockchainConfig,
    contractsConfig,
    databaseConfig,
    IAuthConfig,
    loggerConfig,
    mailConfig,
    servicesConfig,
    storageConfig
} from '../src/config';
import { IJwtPayload } from '../src/auth/types/auth-scheme';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Db, ObjectID } from 'mongodb';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtConfigService } from '../src/auth/options/jwt-options.service';
import * as faker from 'faker';
import { ILinks, IS3File } from '../src/types/scheme';
import { IBalanceCard, IFileCard, IPropertyCard } from '../src/cards/schemas/cards.schema';
import { TestingModule } from '@nestjs/testing/testing-module';
import { MongooseTestOptionsService } from './database/mongoose-test-options.service';
import { ICategoryLeanDocument } from '../src/categories/schemas/categories.schema';
import { ICardSaleLeanDocument } from '../src/cardSales/schemas/card-sales.schema';
import { S3Module } from 'nestjs-s3';
import { S3OptionsService } from '../src/utils/s3-options.service';
import { INonceLeanDocument } from '../src/nonce/schemas/nonce.schema';
import { WinstonModule } from 'nest-winston';
import { WinstonOptionsService } from '../src/logger/winston-options.service';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { SentryOptionsService } from '../src/logger/sentry-options.service';
import { EIP, Network } from '../src/config/types/constants';
import { ICryptocurrencyLeanDocument } from '../src/cryptocurrencies/schemas/cryptocurrency.schema';
import { FeeMethod, HowToCall, SaleKind, Side } from '../src/blockchain/types/wyvern-exchange/enums';
import { IJobLeanDocument } from '../src/jobs/schemas/jobs.schema';
import { SaleStatus } from '../src/cardSales/types/enums';
import { IUserDocument } from '../src/users/schemas/user.schema';
import {
    IStoreFrontLeanDocument,
    IStoreFrontPageBlock
} from '../src/storeFronts/schemas/store-fronts.schema';
import {
    CollectiblesChooseType,
    CollectiblesSortType,
    StoreFrontCardStatus,
    StoreFrontCollectionStatus,
    StoreFrontPage,
    StoreFrontPageBlock
} from '../src/storeFronts/types/enums';
import { useContainer } from 'class-validator';
import { ExceptionsFilter } from '../src/exceptions/exceptions.filter';
import { IContractMetadataLeanDocument } from '../src/metadata/schemas/contract-metadata.schema';
import { v4 as uuidv4 } from 'uuid';
import { ITokenMetadataLeanDocument } from '../src/metadata/schemas/token-metadata.schema';
import { IFollowLeanDocument } from '../src/follows/schemas/follows.schema';
import { IClientLeanDocument } from '../src/external/clients/schemas/client.schema';
import { AuthService } from '../src/auth/auth.service';
import { ICollectibleLeanDocument } from '../src/external/collectibles/schemas/collectible.schema';

interface MongoScheme {
    _id?: string;
}

export interface IUser extends MongoScheme {
    ethAddress: string;
    name: string;
    verified: boolean;
    description?: string;
    slug?: string;
    links?: ILinks;
    avatar?: IS3File;
}

export interface ITokenCollection extends MongoScheme {
    contractId: string;
    userId: string;
    name: string;
    symbol: string;
    logo: IS3File;
    description: string;
    slug?: string;
    links: ILinks;
    popularity: number;
    categoryIds: string[];
    blockchain: Network;
}

export interface ICard extends MongoScheme {
    tokenId: string;
    eipVersion: EIP;
    identifier: number;
    uri: string;
    totalSupply: number;
    creator: string;
    balances: IBalanceCard[];
    hasSale: boolean;
    categoryId: string;
    tokenCollectionId: string;
    name: string;
    file: IFileCard;
    description?: string;
    isPrivate: boolean;
    properties?: Array<IPropertyCard>;
    lockedData?: string;
    viewersCount: number;
    likes: string[];
    dislikes: string[];
}

interface IStoreBaseData {
    user: IUser;
    token: string;
}

interface IContractMetadata {
    contractMetadata: IContractMetadataLeanDocument;
    tokensMetadata?: ITokenMetadataLeanDocument[];
    uri: string;
}

interface ICardCollection {
    tokenCollectionEntity: ITokenCollection;
    cardEntity: ICard;
    testCategory: ICategoryLeanDocument;
    sale: ICardSaleLeanDocument;
}

export const EIP_TOKENS = [
    {
        token: '0xe3782b8688ad2b0d5ba42842d400f7adf310f88d-0x8',
        URI: 'https://api.bccg.digital/api/bccg/8',
        identifier: '8',
        totalSupply: '300',
        metadata: {
            external_url: 'https://www.bondly.finance/',
            image: 'https://api.bccg.digital/images/BIANCA-DARK.jpg',
            name: 'Bianca - Madness by Midnight',
            description: 'Art by IG : ninjaart4',
            attributes: [
                { trait_type: 'Art', value: 'ninjaart4' },
                { trait_type: 'BIA', value: 'Bianca' },
                { trait_type: 'GH', value: 'Gothic Horror' },
                { trait_type: 'Promo', value: 'Promo' }
            ]
        },
        eipVersion: EIP.EIP_1155,
        network: Network.ETHEREUM,
    }
];

export const EIP_TOKEN_BALANCES = [
    {
        account: { id: '0xc2e76b4c0e3cfef8a69bbd82e99a5bf4c828e987' },
        id: '0xe3782b8688ad2b0d5ba42842d400f7adf310f88d-0x8-0xc2e76b4c0e3cfef8a69bbd82e99a5bf4c828e987',
        value: '300'
    }
];

export const randomEipToken = (contract: string) => {
    const totalSupply = faker.random.number({ min: 1, max: 300 });
    const token = faker.finance.ethereumAddress();
    const userEthAddress = JSON.parse(contract).contractCreator;
    return {
        token,
        eipVersion: EIP.EIP_1155,
        URI: faker.internet.url(),
        identifier: faker.random.number(),
        totalSupply,
        balances: [
            {
                account: { id: userEthAddress },
                id: `${token}-${userEthAddress}`,
                value: totalSupply,
                transfersFrom: [],
                transfersTo: []
            }
        ],
        metadata: {
            external_url: faker.internet.url(),
            image: faker.image.imageUrl(),
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            attributes: [
                { trait_type: faker.database.column(), value: faker.random.word() },
                { trait_type: faker.database.column(), value: faker.random.word() },
                { trait_type: faker.database.column(), value: faker.random.word() },
                { trait_type: faker.database.column(), value: faker.random.word() }
            ]
        }
    };
}

export const COIN_MARKET_SUCCESS_MAP_RESPONSE = {
    status: {
        error_code: 0
    },
    data: [{
        id: 1,
        name: 'Test',
        symbol: 'TST',
        slug: 'Test',
        rank: 5,
        platform: {
            id: 1,
            name: 'Platform Test',
            symbol: 'P_TST',
            slug: 'platform_test_slug',
            token_address: 'token_address',
        }
    }]
}

export const COIN_MARKET_FAIL_RESPONSE = {
    status: {
        error_code: 111
    },
    data: []
}

export const COIN_MARKET_SUCCESS_QUOTES_RESPONSE = {
    status: {
        error_code: 0
    },
    data: {
        '1': {
            symbol: 'TST',
            id: 1,
            quote: {
                'USD': {
                    price: 55
                }
            },
        }
    }
}

const cryptocurrencies = [
    {
        "id": 1027,
        "name": "Ethereum",
        "symbol": "ETH",
        "slug": "ethereum",
        "rank": 2,
        "is_active": 1,
        "first_historical_data": "2015-08-07T14:49:30.000Z",
        "last_historical_data": "2021-03-02T08:19:24.000Z",
        "platform": {
            "id": 1839,
            "name": "Heco",
            "symbol": "BNB",
            "slug": "binance-coin",
            "token_address": "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd"
        }
    },
    {
        "id" : 2396,
        "name" : "WETH",
        "platform" : {
            "id" : 1027,
            "name" : "Ethereum",
            "symbol" : "ETH",
            "slug" : "ethereum",
            "token_address" : "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
        },
        "rank" : 2529,
        "slug" : "weth",
        "symbol" : "WETH"
    },
    {
        "id": 825,
        "name": "Tether",
        "symbol": "USDT",
        "slug": "tether",
        "rank": 5,
        "is_active": 1,
        "first_historical_data": "2015-02-25T13:34:26.000Z",
        "last_historical_data": "2021-03-02T08:19:10.000Z",
        "platform": {
            "id": 1027,
            "name": "Ethereum",
            "symbol": "ETH",
            "slug": "ethereum",
            "token_address": "0xdac17f958d2ee523a2206206994597c13d831ec7"
        }
    },
    {
        "id": 1680,
        "name": "Aragon",
        "symbol": "ANT",
        "slug": "aragon",
        "rank": 151,
        "is_active": 1,
        "first_historical_data": "2017-05-18T21:29:54.000Z",
        "last_historical_data": "2021-03-02T08:19:08.000Z",
        "platform": {
            "id": 1027,
            "name": "Ethereum",
            "symbol": "ETH",
            "slug": "ethereum",
            "token_address": "0xa117000000f279d81a1d3cc75430faa017fa5a2e"
        }
    }
];

export const TEST_CATEGORY_EN_TITLE = 'Test category';
export const TEST_USER_ETH_ADDRESS = '0xfa35c543e8c3f125e164d2fb07c587c2895700bd';
export const TEST_USER_ARKANE_WALLET_ADDRESS = '0x96e4bb1de29bea28e8e34ef29a122de3a6ddf7db';

export const imgBase64 = 'R0lGODdhAQABAPAAAP8AAAAAACwAAAAAAQABAAACAkQBADs=';

export const animationBase64 = '/+MYxAAEaAIEeUAQAgBgNgP/////KQQ/////Lvrg+lcWYHgtjadzsbTq+yREu495tq9c6v/7vt/of7mna9v' +
    '6/btUnU17Jun9/+MYxCkT26KW+YGBAj9v6vUh+zab//v/96C3/pu6H+pv//r/ycIIP4pcWWTRBBBAMXgNdbRaABQAAABRWKwgjQVX0ECmrb///' +
    '+MYxBQSM0sWWYI4A++Z/////////////0rOZ3MP//7H44QEgxgdvRVMXHZseL//540B4JAvMPEgaA4/0nHjxLhRgAoAYAgA/+MYxAYIAAJfGYE' +
    'QAMAJAIAQMAwX936/q/tWtv/2f/+v//6v/+7qTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

const getMongoDb = (connection: Connection): Db => connection.db;
const getConfigService = (app: INestApplication | TestingModule): ConfigService => app.get(ConfigService);

export const randomUser = (useFaker = false): IUser => {
    if (!useFaker) {
        return {
            ethAddress: TEST_USER_ETH_ADDRESS,
            name: 'Test User',
            verified: true,
            slug: `${faker.random.word()}-${uuidv4()}`,
            avatar: {
                provider: 's3',
                key: 'Key',
                location: faker.image.imageUrl(),
                etag: 'ETag',
                bucket: 'Bucket',
                mimetype: 'image/png',
                extension: 'png'
            },
            description: 'Test description',
            links: {
                website: faker.internet.url(),
                twitter: faker.internet.userName(),
                medium: faker.internet.userName(),
                telegram: faker.internet.userName(),
                discord: faker.internet.userName()
            },
        }
    }

    return {
        ethAddress: faker.finance.ethereumAddress(),
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
        verified: faker.random.boolean(),
        slug: faker.helpers.randomize([null, faker.lorem.slug()]),
        avatar: {
            provider: 's3',
            key: 'Key',
            location: faker.image.imageUrl(),
            etag: 'ETag',
            bucket: 'Bucket',
            mimetype: 'image/png',
            extension: 'png'
        },
        description: faker.lorem.words(faker.random.number({ min: 10, max: 50 })),
        links: {
            website: faker.internet.url(),
            twitter: faker.internet.userName(),
            medium: faker.internet.userName(),
            telegram: faker.internet.userName(),
            discord: faker.internet.userName()
        },
    }
};

export const createApp = (moduleFixture: TestingModule): INestApplication => {
    const app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            validationError: {
                target: false
            },
            exceptionFactory: (errors) => new BadRequestException(errors)
        })
    );

    useContainer(moduleFixture, { fallbackOnErrors: true });

    return app;
};

export const baseAppProviders = () => [
    { provide: APP_FILTER, useClass: ExceptionsFilter }
];

export const baseAppModules = () => [
    MongooseModule.forRootAsync({
        imports: [ConfigModule],
        useClass: MongooseTestOptionsService
    }),
    ConfigModule.forRoot({
        envFilePath: '.env.test',
        load: [
            databaseConfig,
            appConfig,
            authConfig,
            storageConfig,
            servicesConfig,
            loggerConfig,
            contractsConfig,
            blockchainConfig,
            mailConfig
        ]
    }),
    JwtModule.registerAsync({
        imports: [ConfigModule],
        useClass: JwtConfigService
    }),
    S3Module.forRootAsync({
        imports: [ConfigModule],
        useClass: S3OptionsService
    }),
    WinstonModule.forRootAsync({
        imports: [ConfigModule],
        useClass: WinstonOptionsService
    }),
    SentryModule.forRootAsync({
        imports: [ConfigModule],
        useClass: SentryOptionsService
    }),
];

export const getContextId = (): ContextId => {
    const contextId = ContextIdFactory.create();
    jest.spyOn(ContextIdFactory, 'getByRequest').mockImplementation(() => contextId);

    return contextId;
};

export const prepareCategories = async (connection: Connection): Promise<Array<ICategoryLeanDocument>> => {
    const db = getMongoDb(connection);

    const getRandomCategory = (): ICategoryLeanDocument => {
        const num = Math.floor(10000 * Math.random());
        return {
            icon: {
                provider: 's3',
                key: 'Key',
                location: faker.image.imageUrl(),
                etag: 'ETag',
                bucket: 'Bucket',
                mimetype: 'image/png',
                extension: 'png'
            },
            title: {
                'en': `Dummy Title ${num}`
            },
            description: {
                'en': `Dummy Description ${num}`
            },
            parentId: null,
            order: num,
            isTopCategory: true,
            createdAt: new Date()
        };
    };

    const categoriesCollection = db.collection(DaoIds.categories);
    const categoriesData = new Array(10).fill(0).map(getRandomCategory)
    const res = await categoriesCollection.insertMany(categoriesData);
    const user = await getUser(db);

    const collections = [];
    res.ops.map(async category => {
        for (let i = 0; i < 10; i++) {
            collections.push(randomCollection(user, category));
        }
    });
    await db.collection(DaoIds.tokenCollections).insertMany(collections);

    return res.ops;
}

export const prepareDb = async (
    app: INestApplication | TestingModule,
    connection: Connection,
    userFaker = false
): Promise<IStoreBaseData> => {
    const db = getMongoDb(connection);

    const usersCollection = db.collection(DaoIds.users);
    const res = await usersCollection.insertOne(randomUser(userFaker));
    const user = await usersCollection.findOne({ _id: res.insertedId });
    const token = await getToken(app, connection, user);

    return { user, token };
};

const getUser = async (db: Db): Promise<IUser> => {
    const usersCollection = db.collection(DaoIds.users);
    const user = await usersCollection.findOne({});

    if (!user) {
        const user = await db.collection(DaoIds.users).insertOne(randomUser());
        return user.ops[0];
    }

    return user;
};

export const createRandomUser = async (
    connection: Connection,
    params?: Partial<IUserDocument>
): Promise<IUser> => {
    const db = getMongoDb(connection);
    const usersCollection = db.collection(DaoIds.users);
    const res = await usersCollection.insertOne({ ...randomUser(), ...params });
    return usersCollection.findOne({ _id: res.insertedId });
};

export const prepareTokenCollections = async (connection: Connection, user: IUser): Promise<void> => {
    const db = getMongoDb(connection);
    const tokenCollection = db.collection(DaoIds.tokenCollections);

    const testCategory = await getTestCategory(db);

    const users = await prepareUsers(db);

    const createCollection = async () => {
        const res = await tokenCollection.insertOne(randomCollection(user, testCategory));
        const tokenCollectionEntity = await tokenCollection.findOne({ _id: res.insertedId });
        const cardsData = [];

        for (let i = 0; i < faker.random.number({ min: 1, max: 10 }); i++) {
            cardsData.push(randomCard(user, tokenCollectionEntity, testCategory, true, users));
        }

        await db.collection(DaoIds.cards).insertMany(cardsData);
    };

    for (let i = 0; i < 10; i++) {
        await createCollection();
    }

    await prepareCardSales(db);
};

export const prepareUsers = async (db: Db): Promise<IUser[]> => {
    const users = [];
    for (let i = 0; i < 50; i++) {
        users.push(randomUser(true));
    }
    const res = await db.collection(DaoIds.users).insertMany(users);

    return res.ops;
}

export const prepareCryptocurrencies = async (connection: Connection): Promise<ICryptocurrencyLeanDocument[]> => {
    const db = getMongoDb(connection);
    const res = await db.collection(DaoIds.cryptocurrencies).insertMany(cryptocurrencies);

    return res.ops;
}

export const prepareCardSales = async (db: Db) => {
    const cards = await db.collection(DaoIds.cards).find({}).toArray();
    if (!cards.length) {
        throw new Error('there is no any cards');
    }

    const cardsSalesData = [];
    cards.forEach((card: ICard) => {
        if (!card.balances.length) {
            return;
        }

        if (!card.hasSale) {
            return;
        }

        let addSale = false;
        card.balances.forEach(balance => {
            if (!balance.userId) {
                return;
            }
            if (faker.random.boolean()) {
                cardsSalesData.push(randomSale(card._id, balance.userId as string, balance.tokenAmount));
                addSale = true;
            }
        });

        if (!addSale) {
            const balance = card.balances.find(balance => balance.userId);
            if (balance) {
                cardsSalesData.push(randomSale(card._id, balance.userId as string, balance.tokenAmount));
            }
        }
    });

    if (!cardsSalesData.length) {
        return;
    }

    await db.collection(DaoIds.cardSales).insertMany(cardsSalesData);
}

export const prepareNonce = async (
    connection: Connection,
    name: string = Nonce.default
): Promise<INonceLeanDocument> => {
    const db = getMongoDb(connection);
    const nonceCollection = db.collection(DaoIds.nonce);

    let nonceInstance = await nonceCollection.findOne({ name });

    if (!nonceInstance) {
        const res = await nonceCollection.insertOne({ name, nonce: 0 });
        nonceInstance = res.ops[0];
    }

    return nonceInstance;
}

export const prepareJobs = async (
    network: Network,
    connection: Connection,
    { type, contractAddress, processingBlockNumber }: Partial<IJobLeanDocument>
): Promise<IJobLeanDocument> => {
    const db = getMongoDb(connection);
    const jobsCollection = db.collection(DaoIds.jobs);

    const res = await jobsCollection.insertOne({ network, type, contractAddress, processingBlockNumber });

    return res.ops[0];
}

export const getStoreFrontSettings = (cards?: string[], collections?: string[]): IStoreFrontPageBlock[] => ([
    {
        type: StoreFrontPageBlock.HEADER,
        settings: {
            texts: {
                name: 'test',
                headline: 'headline'
            },
            collectibles: {
                choose: CollectiblesChooseType.AUTOMATIC,
                cards,
                collections,
                itemsType: StoreFrontCardStatus.ON_SALE,
                sort: CollectiblesSortType.MOST_POPULAR
            }
        }
    },
    {
        type: StoreFrontPageBlock.MOST_POPULAR,
        sortOrder: 1,
        isVisible: true,
        settings: {
            texts: {
                name: 'test 2',
                headline: 'headline 2'
            },
            collectibles: {
                choose: CollectiblesChooseType.AUTOMATIC,
                cards,
                collections,
                itemsType: StoreFrontCardStatus.ON_SALE,
                sort: CollectiblesSortType.MOST_POPULAR,
                itemSize: 'large',
                rows: 2
            },
            settings: {
                backgroundColor: 'white'
            }
        }
    }
]);

export const prepareStoreFront = async (connection: Connection, user: IUser): Promise<IStoreFrontLeanDocument> => {
    const db = getMongoDb(connection);
    const sfCollection = db.collection(DaoIds.storeFronts);

    const { cardEntity, tokenCollectionEntity } = await getCard(connection, user);

    const sf = {
        owner: user._id,
        name: 'test',
        cards: [{ cardId: cardEntity._id, status: StoreFrontCardStatus.ON_SALE }],
        collections: [{ collectionId: tokenCollectionEntity._id, status: StoreFrontCollectionStatus.FEATURED }],
        pages: [
            {
                name: StoreFrontPage.HOME,
                blocks: getStoreFrontSettings(
                    [cardEntity._id.toString()],
                    [tokenCollectionEntity._id.toString()]
                )
            }
        ]
    };

    const res = await sfCollection.insertOne(sf);

    return res.ops[0];
};

export const prepareMetadata = async (
    connection: Connection,
    user: IUser,
    contractAddress?: string,
    contractSlug?: string
): Promise<IContractMetadata> => {
    const db = getMongoDb(connection);
    const contractMetadataCollection = db.collection(DaoIds.contractMetadata);
    const slug = contractSlug || 'test-contract-slug';
    const file = {
        provider: 's3',
        key: 'Key',
        location: 'location',
        etag: 'ETag',
        bucket: 'Bucket',
        mimetype: 'image/png',
        extension: 'png'
    };

    const meta = {
        description: 'test_description',
        logo: file,
        userId: user._id,
        name: 'test_name',
        symbol: 'ETH',
        links: {
            twitter: '@TestTWITTER'
        },
        slug
    };

    const res = await contractMetadataCollection.insertOne(meta);
    const contractMetadata = res.ops[0];

    let tokensMetadata = undefined;
    if (contractAddress) {
        const tokenCollection = db.collection(DaoIds.tokenCollections);
        const contract = randomCollection(user, { _id: new ObjectID() } as any, slug);
        contract.contractId = contractAddress;
        const resCollection = await tokenCollection.insertOne(contract);
        const tokenMetadataCollection = db.collection(DaoIds.tokenMetadata);
        const tokensMeta: ITokenMetadataLeanDocument[] = [];

        for (let i = 1; i <= 10; i++) {
            tokensMeta.push({
                tokenCollectionId: resCollection.ops[0]._id,
                userId: contractMetadata.userId,
                contractMetadataId: contractMetadata._id,
                contractAddress: resCollection.ops[0].contractId,
                token_identifier: i,
                image: file,
                animation: file,
                description: `description- ${i}`,
                name: `name- ${i}`,
                attributes: [
                    {
                        trait_type: `trait_type-${i}`,
                        value: `value-${i}`,
                    }
                ]
            } as ITokenMetadataLeanDocument);
        }
        const resTokens = await tokenMetadataCollection.insertMany(tokensMeta);
        tokensMetadata = resTokens.ops;
    }

    const { metadataUriDomain } = blockchainConfig();
    const { appGlobalRoutePrefix } = appConfig();

    return {
        contractMetadata,
        tokensMetadata,
        uri: `${metadataUriDomain}/${appGlobalRoutePrefix}/metadata/users/${user._id.toString()}/collections/${slug}`,
    };
};

export const prepareFollows = async (
    connection: Connection,
    user: IUser
): Promise<{ followingData: IFollowLeanDocument[], followersData: IFollowLeanDocument[] }> => {
    const db = getMongoDb(connection);
    const followCollection = db.collection(DaoIds.follows);

    const followingData = [];
    const followersData = [];
    const users = await prepareUsers(db);
    for (let i = 0; i < 25; i++) {
        if (i < 10) {
            followingData.push({
                userId: user._id,
                followUserId: users[i]._id,
            });
        } else {
            followersData.push({
                userId: users[i]._id,
                followUserId: user._id,
            });
        }

    }
    const resFollowings = await followCollection.insertMany(followingData);
    const resFollowers = await followCollection.insertMany(followersData);

    return { followingData: resFollowings.ops, followersData: resFollowers.ops };
};

export const createFollow = async (
    connection: Connection,
    userId: string | ObjectID,
    followUserId: string | ObjectID
): Promise<IFollowLeanDocument> => {
    userId = typeof userId === 'string' ? new ObjectID(userId) : userId;
    followUserId = typeof followUserId === 'string' ? new ObjectID(followUserId) : followUserId;

    const db = getMongoDb(connection);
    const res = await db.collection(DaoIds.follows).insertOne({ userId, followUserId });

    return res.ops[0];
}

export const createClient = async (
    connection: Connection,
    client: IClientLeanDocument
): Promise<IClientLeanDocument> => {
    const db = getMongoDb(connection);
    const res = await db.collection(DaoIds.externalClients).insertOne(client);

    return res.ops[0];
}

export const getExternalAccessToken = (
    clientId: string,
    clientSecret: string,
    method: string,
    path: string,
    query?: any,
    body?: any
): { req: { method: string, path: string, query: any, body: any }, token: string  } => {
    const req = {
        method,
        path,
        query: { clientId, time: new Date().toISOString(), ...query },
        body: { ...body }
    };
    return {
        req,
        token: AuthService.calculateHashBySecretAndRequest(clientSecret, req as any)
    };
}

export const prepareExternalCollectible = async (
    connection: Connection,
    client: IClientLeanDocument,
    marketPlaceUser: IUser,
    contractMetadataSlug: string,
    token_identifier = 1,
    maxSupply = 50,
    externalCollectibleId = 'externalCollectibleId',
    externalCreatorId = 'externalCreatorId',
    externalCreatorEmail = 'externalCreatorEmail@gmail.com'
): Promise<{
    contractMetadata: IContractMetadataLeanDocument,
    tokenMetadata: ITokenMetadataLeanDocument,
    collectible: ICollectibleLeanDocument
}> => {
    const db = getMongoDb(connection);

    const contractMetadataCollection = db.collection(DaoIds.contractMetadata);
    const [contractMetadata] = (await contractMetadataCollection.insertOne({
        userId: marketPlaceUser._id,
        slug: contractMetadataSlug,
        name: 'Test contract'
    })).ops;

    const tokenMetadataCollection = db.collection(DaoIds.tokenMetadata);
    const [tokenMetadata] = (await tokenMetadataCollection.insertOne({
        userId: marketPlaceUser._id,
        contractMetadataId: contractMetadata._id,
        token_identifier,
        image: {
            provider: 's3',
            key: 'Key',
            location: 'location',
            etag: 'ETag',
            bucket: 'Bucket',
            mimetype: 'image/png',
            extension: 'png'
        },
        name: 'Test token',
    })).ops;

    const collectibleCollection = db.collection(DaoIds.externalCollectibles);
    const [collectible] = (await collectibleCollection.insertOne({
        clientId: client._id,
        externalCollectibleId,
        externalCreatorId,
        externalCreatorEmail,
        maxSupply,
        distributedCount: 0,
        tokenMetadataId: tokenMetadata._id
    })).ops;

    return { contractMetadata, tokenMetadata, collectible };
};

export const getCard = async (connection: Connection, user: IUser, isLiked?: boolean): Promise<ICardCollection> => {
    const db = getMongoDb(connection);

    const testCategory = await getTestCategory(db);

    const tokenCollection = db.collection(DaoIds.tokenCollections);
    const resCollection = await tokenCollection.insertOne(randomCollection(user, testCategory));
    const tokenCollectionEntity = await tokenCollection.findOne({ _id: resCollection.insertedId });

    const cardsCollection = db.collection(DaoIds.cards);
    const card = randomCard(user, tokenCollectionEntity, testCategory, false, null, isLiked);
    const resCard = await cardsCollection.insertOne(card);
    const cardEntity = await cardsCollection.findOne({ _id: resCard.insertedId });

    const sale = await db.collection(DaoIds.cardSales).insertOne(
        randomSale(card._id, user._id, card.balances[0].tokenAmount, 3)
    );

    return { tokenCollectionEntity, cardEntity, testCategory, sale: sale.ops[0] };
};

export const createCardSale = async (connection: Connection, cardId, userId, tokenAmount) => {
    const db = getMongoDb(connection);
    const sale = await db.collection(DaoIds.cardSales).insertOne(
        randomSale(cardId, userId, tokenAmount, 3)
    );
    return sale.ops[0];
};

export const getTestCategory = async (db: Db): Promise<ICategoryLeanDocument> => {
    const categoryCollection = db.collection(DaoIds.categories);

    let testCategory = await categoryCollection.findOne({ 'title.en': TEST_CATEGORY_EN_TITLE });

    if (!testCategory) {
        const res = await categoryCollection.insertOne({
            icon: {
                provider: 's3',
                key: 'Key',
                location: faker.image.imageUrl(),
                etag: 'ETag',
                bucket: 'Bucket',
                mimetype: 'image/png',
                extension: 'png'
            },
            title: {
                en: TEST_CATEGORY_EN_TITLE
            },
            description: {
                en: `Dummy Description Test`
            },
            parentId: null,
            order: -1,
            isTopCategory: true,
            createdAt: new Date()
        });
        testCategory = res.ops[0];
    }

    return testCategory;
};

export const randomCollection = (user: IUser, category: ICategoryLeanDocument, slug?: string): ITokenCollection => ({
    contractId: faker.random.uuid(),
    userId: user._id,
    name: faker.commerce.productName(),
    symbol: faker.finance.currencySymbol(),
    logo: {
        provider: 's3',
        key: 'Key',
        location: faker.image.imageUrl(),
        etag: 'ETag',
        bucket: 'Bucket',
        mimetype: 'image/png',
        extension: 'png'
    },
    description: faker.commerce.productDescription(),
    slug: slug ?? faker.helpers.randomize([null, faker.lorem.slug()]),
    links: {
        website: faker.internet.url(),
        twitter: faker.internet.userName(),
        medium: faker.internet.userName(),
        telegram: faker.internet.userName(),
        discord: faker.internet.userName()
    },
    popularity: Math.floor(1000 * Math.random()),
    categoryIds: [category._id],
    blockchain: Network.ETHEREUM
});

export const randomCard = (
    user: IUser,
    tokenCollection: Partial<ITokenCollection>,
    category: ICategoryLeanDocument = null,
    useFaker = true,
    users: IUser[] = [],
    isLiked?: boolean
): ICard => {
    if (!useFaker) {
        return {
            tokenId: uuidv4(),
            eipVersion: EIP.EIP_1155,
            identifier: 1,
            uri: faker.internet.url(),
            totalSupply: 1,
            creator: user._id,
            balances: [{
                balanceId: 'balanceId',
                tokenAmount: 1,
                userId: user._id,
                ethAddress: user.ethAddress
            }],
            hasSale: true,
            tokenCollectionId: tokenCollection._id,
            categoryId: category?._id || null,
            name: 'Test item',
            file: {
                original: {
                    provider: 's3',
                    key: 'Key',
                    location: 'original_location',
                    etag: 'ETag',
                    bucket: 'Bucket',
                    mimetype: 'image/png',
                    extension: 'png'
                },
                preview: {
                    provider: 's3',
                    key: 'Key',
                    location: 'preview_location',
                    etag: 'ETag',
                    bucket: 'Bucket',
                    mimetype: 'image/png',
                    extension: 'png'
                }
            },
            description: 'Test description',
            isPrivate: false,
            properties: [
                { property: 'prop1', value: 'test1' },
                { property: 'prop2', value: 'test2' }
            ],
            lockedData: 'Locked test',
            likes: isLiked ? [user._id] : [],
            dislikes: typeof isLiked === 'boolean' && !isLiked ? [user._id] : [],
            viewersCount: 0
        };
    }

    let properties = null;
    if (faker.random.boolean()) {
        properties = { properties: [] };
        for (let i = 0; i < faker.random.number({ min: 1, max: 10 }); i++) {
            properties.properties.push({
                property: faker.database.column(),
                value: faker.random.word()
            });
        }
    }

    const totalSupply = faker.random.number({ min: 1, max: 10 });
    const balances = [];
    let tokenBalancesCount = 0;
    while (tokenBalancesCount < totalSupply) {
        const tokenAmount = faker.random.number({ min: 1, max: totalSupply - tokenBalancesCount });
        const balanceUsers = balances.map(balance => balance.userId.toString());
        const freeUsers = users.filter(user => balanceUsers.indexOf(user._id.toString()) === -1);
        const owner = freeUsers && freeUsers[0] ? freeUsers[Math.floor(Math.random() * freeUsers.length)] : user;
        balances.push({
            balanceId: faker.random.uuid(),
            tokenAmount,
            userId: owner._id,
            ethAddress: owner.ethAddress
        });
        tokenBalancesCount += tokenAmount;
    }

    const balancesWithUsers = balances.filter(balance => balance.userId !== null);
    const lockedData = faker.random.boolean() ? { lockedData: faker.image.imageUrl() } : null;

    return {
        tokenId: faker.random.uuid(),
        eipVersion: EIP.EIP_1155,
        identifier: faker.random.number(),
        uri: faker.internet.url(),
        totalSupply,
        creator: user._id,
        balances,
        hasSale: balancesWithUsers.length ? faker.random.boolean() : false,
        tokenCollectionId: tokenCollection._id,
        name: faker.commerce.productName(),
        file: {
            original: {
                provider: 's3',
                key: 'Key',
                location: faker.image.imageUrl(),
                etag: 'ETag',
                bucket: 'Bucket',
                mimetype: 'image/png',
                extension: 'png'
            },
            preview: faker.helpers.randomize([
                null,
                {
                    provider: 's3',
                    key: 'Key',
                    location: faker.image.imageUrl(),
                    etag: 'ETag',
                    bucket: 'Bucket',
                    mimetype: 'image/png',
                    extension: 'png'
                }
            ])
        },
        description: faker.commerce.productDescription(),
        isPrivate: faker.random.boolean(),
        categoryId: category?._id || null,
        viewersCount: faker.random.number({ min: 0, max: 100 }),
        ...properties,
        ...lockedData
    };
};

export const randomSale = (
    cardId: string,
    userId: string,
    tokensCount: number,
    salePrice?: number
): Partial<ICardSaleLeanDocument> => {
    const price = salePrice || faker.random.float({ min: 0, max: 50 });
    const currency = cryptocurrencies[Math.floor(Math.random() * cryptocurrencies.length)];
    return {
        cardId,
        userId,
        tokensCount,
        price,
        currency: {
            symbol: currency.symbol,
            symbolId: faker.random.boolean() ? currency.id : null,
        },
        publishFrom: faker.date.future(),
        priceUsd: price * 1700,
        signature: faker.random.alphaNumeric(32),
        saleContract: faker.random.alphaNumeric(32),
        order: [],
        orderParsed: {
            addrs: [],
            calldata: 'calldata',
            feeMethod: FeeMethod.splitFee,
            side: Side.sell,
            saleKind: SaleKind.fixedPrice,
            howToCall: HowToCall.call,
            replacementPattern: 'replacementPattern',
            staticExtradata: 'staticExtradata',
            uints: [],
        },
        orderHash: 'orderHash',
        status: SaleStatus.sale,
    };
};

export const randomCryptocurrency = () => ({
    id: faker.random.number({ min: 1 }),
    name: faker.random.word(),
    symbol: faker.random.word(),
    slug: faker.lorem.slug(),
    rank: faker.random.number({ min: 1 }),
    platform: {
        id: faker.random.number({ min: 1 }),
        name: faker.random.word(),
        symbol: faker.random.word(),
        slug: faker.lorem.slug(),
        token_address: faker.finance.ethereumAddress(),
    }
});

export const clearDb = async (connection: Connection | Db): Promise<void> => {
    let db = connection;

    if (db instanceof Connection) {
        db = getMongoDb(db);
    }

    await db.collection(DaoIds.users).deleteMany({});
    await db.collection(DaoIds.userSessions).deleteMany({});
    await db.collection(DaoIds.userSignatureRequests).deleteMany({});
    await db.collection(DaoIds.tokenCollections).deleteMany({});
    await db.collection(DaoIds.cards).deleteMany({});
    await db.collection(DaoIds.categories).deleteMany({});
    await db.collection(DaoIds.cardSales).deleteMany({});
    await db.collection(DaoIds.cryptocurrencies).deleteMany({});
    await db.collection(DaoIds.storeFronts).deleteMany({});
    await db.collection(DaoIds.nonce).deleteMany({});
    await db.collection(DaoIds.jobs).deleteMany({});
    await db.collection(DaoIds.cardViewers).deleteMany({});
    await db.collection(DaoIds.contractMetadata).deleteMany({});
    await db.collection(DaoIds.tokenMetadata).deleteMany({});
    await db.collection(DaoIds.follows).deleteMany({});
    await db.collection(DaoIds.externalClients).deleteMany({});
    await db.collection(DaoIds.externalCollectibles).deleteMany({});
};

export const dropDb = async (connection: Connection): Promise<void> => {
    await connection.dropDatabase();
};

export const shutdownTest = async (app: INestApplication | TestingModule, connection?: Connection): Promise<void> => {
    if (connection) {
        await dropDb(connection);
        await connection.close();
    }
    await app.close();
};

export const getToken = async (
    app: INestApplication | TestingModule,
    connection: Connection,
    user: IUser
): Promise<string> => {
    const db = getMongoDb(connection);
    const configService = getConfigService(app);
    const userSessionCollection = db.collection(DaoIds.userSessions);

    const {
        jwt: { expiresIn }
    } = configService.get<IAuthConfig>('auth');
    const expireAt = new Date(new Date().getTime() + expiresIn);

    const res = await userSessionCollection.insertOne({
        userId: user._id,
        expireAt,
        isActive: true
    });
    const session = await userSessionCollection.findOne({ _id: res.insertedId });

    const payload: IJwtPayload = {
        sub: user._id,
        sessionId: session._id
    };
    const jwtService: JwtService = app.get(JwtService);

    return jwtService.sign(payload);
};

export const expectArrayResponse = (res: any, checkFirstItem = true) => {
    expect(res.body).toBeDefined();
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.data.length);
    if (checkFirstItem) {
        expect(res.body.data[0]).toBeDefined();
        expect(res.body.total).toBeGreaterThan(0);
    }
}

export const expectPaginatedResponse = (res: any, checkFirstItem = true) => {
    expectArrayResponse(res, checkFirstItem);
    expect(res.body.limit).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(0);
    expect(res.body.offset).toBeDefined();
    expect(res.body.offset).toBeGreaterThanOrEqual(0);
}
