import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
    clearDb,
    prepareJobs,
    randomCard,
    randomCollection,
    randomSale,
    shutdownTest
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JobType } from '../../src/jobs/types/enums';
import { blockchainConfig } from '../../src/config';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { Network } from '../../src/config/types/constants';
import { ITokenCollectionDocument } from '../../src/tokenCollections/schemas/token-collection.schema';
import { DaoModelNames } from '../../src/types/constants';
import { JobsService } from '../../src/jobs/jobs.service';
import { CardsModule } from '../../src/cards/cards.module';
import { CardsService } from '../../src/cards/cards.service';
import { ICardDocument } from '../../src/cards/schemas/cards.schema';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { ITokensData } from '../../src/subgraph/types/scheme';
import { ObjectID } from 'mongodb';
import { ICardSaleDocument } from '../../src/cardSales/schemas/card-sales.schema';
import { v4 as uuidv4 } from 'uuid';

describe('burnedTokensListener-lambda', () => {
    let subgraphService: SubgraphService;
    let cardsService: CardsService;
    let jobsService: JobsService;
    let app: TestingModule;
    let dbConnection: Connection;
    let startBlockNumber: number;
    let tokensData: ITokensData;
    let tokenCollectionModel: Model<ITokenCollectionDocument>;
    let cardModel: Model<ICardDocument>;
    let cardSaleModel: Model<ICardSaleDocument>;
    let userModel: Model<IUserDocument>;
    let user: IUserDocument;
    let tokenCollection: ITokenCollectionDocument;
    let card: ICardDocument;

    const network = Network.MATIC;
    const contractAddress = 'contractAddress'.toLowerCase();
    const tokenIdentifier = 1;
    const totalSupply = 100;
    const userBalance = 70;
    const userBurnAmount = 30;

    async function prepareData(contractId = contractAddress): Promise<{
        user: IUserDocument,
        collectionEntity: ITokenCollectionDocument,
        cardEntity: ICardDocument
    }> {
        const user = await userModel.create({ ethAddress: uuidv4().toLowerCase() });

        const collection = randomCollection(
            user as any,
            { _id: '6040f7db9f8f86d70bc97993' } as any
        );
        collection.contractId = contractId;
        const collectionEntity = await tokenCollectionModel.create(collection);

        const card = randomCard(
            user as any,
            collectionEntity as any,
            { _id: '6040f7db9f8f86d70bc97993' } as any
        );
        card.identifier = tokenIdentifier;
        card.totalSupply = totalSupply;
        card.balances = [
            {
                userId: user.id,
                ethAddress: user.ethAddress,
                tokenAmount: userBalance,
                balanceId: 'balanceId1'
            },
            {
                userId: new ObjectID(),
                ethAddress: 'ethAddress2',
                tokenAmount: 20,
                balanceId: 'balanceId2'
            },
            {
                userId: new ObjectID(),
                ethAddress: 'ethAddress3',
                tokenAmount: 10,
                balanceId: 'balanceId3'
            },
        ];
        const cardEntity = await cardModel.create(card);

        return { user, collectionEntity, cardEntity };
    }

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CardsModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        tokenCollectionModel = app.get(getModelToken(DaoModelNames.tokenCollection));
        cardModel = app.get(getModelToken(DaoModelNames.card));
        userModel = app.get(getModelToken(DaoModelNames.user));
        cardSaleModel = app.get(getModelToken(DaoModelNames.cardSale));
        jobsService = app.get(JobsService);
        subgraphService = app.get(SubgraphService);
        cardsService = app.get(CardsService);
        startBlockNumber = blockchainConfig()[network].startBlock[JobType.burnedTokenListener];
    });

    beforeEach(async () => {
        await prepareJobs(
            Network.MATIC,
            dbConnection,
            {
                type: JobType.burnedTokenListener,
                processingBlockNumber: startBlockNumber
            }
        );

        const data = await prepareData();
        user = data.user;
        tokenCollection = data.collectionEntity;
        card = data.cardEntity;

        tokensData = {
            [tokenCollection.contractId]: [
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: userBurnAmount,
                    user: { id: user.ethAddress },
                },
            ]
        };

        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);
        jest.spyOn(subgraphService, 'getLatestBlockNumber').mockResolvedValue(startBlockNumber + 1);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('Should burn tokens in db', async () => {
        const card = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });

        expect(card).toBeDefined();
        expect(card.totalSupply).toBe(totalSupply);
        expect(card.balances.length).toBeGreaterThan(1);
        expect(card.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const cardUserBalance = card.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUserBalance).toBeDefined();
        expect(cardUserBalance.tokenAmount).toBe(userBalance);

        await cardsService.processBurnedTokens(network);

        const newTotalSupply =  totalSupply - userBurnAmount;
        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeDefined();
        expect(cardAfterBurn.totalSupply).toBe(newTotalSupply);
        expect(cardAfterBurn.balances.length).toBeGreaterThan(1);
        expect(cardAfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(newTotalSupply);
        const cardUserBalanceAfterBurn = cardAfterBurn.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUserBalanceAfterBurn).toBeDefined();
        expect(cardUserBalanceAfterBurn.tokenAmount).toBe(userBalance - userBurnAmount);
    });

    it('Should burn tokens and remove user balance', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        await cardsService.processBurnedTokens(network);

        const newTotalSupply =  totalSupply - tokensData[contractAddress][0].value;
        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeDefined();
        expect(cardAfterBurn.totalSupply).toBe(newTotalSupply);
        expect(cardAfterBurn.balances.length).toBeGreaterThan(1);
        expect(cardAfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(newTotalSupply);
        const cardUserBalanceAfterBurn = cardAfterBurn.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUserBalanceAfterBurn).toBeUndefined();
    });

    it('Should burn tokens and remove card entity', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        await cardModel.updateOne(
            {
                tokenCollectionId: tokenCollection.id,
                identifier: tokenIdentifier
            },
            {
                balances: [{
                    userId: user.id,
                    ethAddress: user.ethAddress,
                    tokenAmount: userBalance,
                    balanceId: 'balanceId1'
                }]
            }
        );
        const card = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(card).toBeDefined();

        await cardsService.processBurnedTokens(network);

        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeNull();
    });

    it('Should burn tokens and remove card entity with all sale', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        await cardModel.updateOne(
            {
                tokenCollectionId: tokenCollection.id,
                identifier: tokenIdentifier
            },
            {
                balances: [{
                    userId: user.id,
                    ethAddress: user.ethAddress,
                    tokenAmount: userBalance,
                    balanceId: 'balanceId1'
                }]
            }
        );
        const card = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(card).toBeDefined();
        await cardSaleModel.insertMany([
            randomSale(card.id, user.id, 1) as any,
            randomSale(card.id, user.id, 2) as any,
            randomSale(card.id, user.id, 3) as any,
        ]);
        const sales = await cardSaleModel.find({ cardId: card.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBeGreaterThan(0);

        await cardsService.processBurnedTokens(network);

        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeNull();
        const salesAfterBurn = await cardSaleModel.find({ cardId: card.id });
        expect(salesAfterBurn).toBeDefined();
        expect(salesAfterBurn.length).toBe(0);
    });

    it('Should burn tokens and remove user balance with all his sale', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        const card = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(card).toBeDefined();

        const salesData = [
            randomSale(card.id, user.id, 1) as any,
            randomSale(card.id, user.id, 2) as any,
            randomSale(card.id, new ObjectID().toString(), 3) as any,
            randomSale(card.id, new ObjectID().toString(), 4) as any,
            randomSale(card.id, new ObjectID().toString(), 5) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: card.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processBurnedTokens(network);

        const newTotalSupply =  totalSupply - tokensData[contractAddress][0].value;
        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeDefined();
        expect(cardAfterBurn.totalSupply).toBe(newTotalSupply);
        expect(cardAfterBurn.balances.length).toBeGreaterThan(1);
        expect(cardAfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(newTotalSupply);
        const cardUserBalanceAfterBurn = cardAfterBurn.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUserBalanceAfterBurn).toBeUndefined();

        const salesAfterBurn = await cardSaleModel.find({ cardId: card.id });
        expect(salesAfterBurn).toBeDefined();
        expect(salesAfterBurn.length).toBeGreaterThan(0);

        const userSalesAfterBurn = await cardSaleModel.find({ cardId: card.id, userId: user.id });
        expect(userSalesAfterBurn).toBeDefined();
        expect(userSalesAfterBurn.length).toBe(0);
    });

    it('Should burn tokens and doesnt remove user balance with all his sale', async () => {
        const card = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(card).toBeDefined();

        const salesData = [
            randomSale(card.id, user.id, 1) as any,
            randomSale(card.id, user.id, 2) as any,
            randomSale(card.id, new ObjectID().toString(), 3) as any,
            randomSale(card.id, new ObjectID().toString(), 4) as any,
            randomSale(card.id, new ObjectID().toString(), 5) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: card.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processBurnedTokens(network);

        const newTotalSupply =  totalSupply - userBurnAmount;
        const cardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(cardAfterBurn).toBeDefined();
        expect(cardAfterBurn.totalSupply).toBe(newTotalSupply);
        expect(cardAfterBurn.balances.length).toBeGreaterThan(1);
        expect(cardAfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(newTotalSupply);
        const cardUserBalanceAfterBurn = cardAfterBurn.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUserBalanceAfterBurn).toBeDefined();
        expect(cardUserBalanceAfterBurn.tokenAmount).toBe(userBalance - userBurnAmount);

        const salesAfterBurn = await cardSaleModel.find({ cardId: card.id });
        expect(salesAfterBurn).toBeDefined();
        expect(salesAfterBurn.length).toBeGreaterThan(0);

        const userSalesAfterBurn = await cardSaleModel.find({ cardId: card.id, userId: user.id });
        expect(userSalesAfterBurn).toBeDefined();
        expect(userSalesAfterBurn.length).toBe(salesData.filter(s => s.userId.toString() === user.id).length);
    });

    it('Should burn tokens and change hasSale attribute in card', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        await cardModel.findByIdAndUpdate(card.id, { hasSale: true });

        const checkCard = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(checkCard).toBeDefined();
        expect(checkCard.hasSale).toBeTruthy();

        const salesData = [
            randomSale(checkCard.id, user.id, 1) as any,
            randomSale(checkCard.id, user.id, 2) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: checkCard.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processBurnedTokens(network);

        const checkCardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(checkCardAfterBurn).toBeDefined();
        expect(checkCardAfterBurn.hasSale).toBeFalsy();
    });

    it('Should burn tokens and doesnt change hasSale attribute in card', async () => {
        tokensData[contractAddress][0].value = userBalance;
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        await cardModel.findByIdAndUpdate(card.id, { hasSale: true });

        const checkCard = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(checkCard).toBeDefined();
        expect(checkCard.hasSale).toBeTruthy();

        const salesData = [
            randomSale(checkCard.id, user.id, 1) as any,
            randomSale(checkCard.id, user.id, 2) as any,
            randomSale(card.id, new ObjectID().toString(), 3) as any,
            randomSale(card.id, new ObjectID().toString(), 4) as any,
            randomSale(card.id, new ObjectID().toString(), 5) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: checkCard.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processBurnedTokens(network);

        const checkCardAfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: tokenIdentifier
        });
        expect(checkCardAfterBurn).toBeDefined();
        expect(checkCardAfterBurn.hasSale).toBeTruthy();
    });

    it('Should burn tokens by multiple data', async () => {
        const {
            user: user2,
            collectionEntity: collectionEntity2,
            cardEntity: cardEntity2
        } = await prepareData('contract2');
        tokensData = {
            [tokenCollection.contractId]: [
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: 1,
                    user: { id: user.ethAddress },
                },
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: 2,
                    user: { id: user.ethAddress },
                },
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: 3,
                    user: { id: user.ethAddress },
                },
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: 5,
                    user: { id: user2.ethAddress },
                },
            ],
            [collectionEntity2.contractId]: [
                {
                    contract: collectionEntity2.contractId,
                    identifier: cardEntity2.identifier,
                    value: 1,
                    user: { id: user2.ethAddress },
                },
                {
                    contract: collectionEntity2.contractId,
                    identifier: cardEntity2.identifier,
                    value: 2,
                    user: { id: user2.ethAddress },
                },
                {
                    contract: collectionEntity2.contractId,
                    identifier: cardEntity2.identifier,
                    value: 3,
                    user: { id: user2.ethAddress },
                },
            ],
        };
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue(tokensData);

        const card1User2Balance = 15;
        const card1TotalSupply = totalSupply + card1User2Balance;
        await cardModel.findByIdAndUpdate(
            card.id,
            {
                balances: [
                    ...card.balances,
                    {
                        userId: user2.id,
                        ethAddress: user2.ethAddress,
                        tokenAmount: 15,
                        balanceId: 'balanceId1'
                    },
                ],
                totalSupply: card1TotalSupply
            }
        );

        const checkCard1 = await cardModel.findById(card.id);
        expect(checkCard1).toBeDefined();
        expect(checkCard1.totalSupply).toBe(card1TotalSupply);
        expect(checkCard1.balances.length).toBeGreaterThan(1);
        expect(checkCard1.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(card1TotalSupply);
        const cardUser1Balance = checkCard1.balances.find(balance => balance.userId.toString() === user.id);
        expect(cardUser1Balance).toBeDefined();
        expect(cardUser1Balance.tokenAmount).toBe(userBalance);
        const cardUser2Balance = checkCard1.balances.find(balance => balance.userId.toString() === user2.id);
        expect(cardUser2Balance).toBeDefined();
        expect(cardUser2Balance.tokenAmount).toBe(card1User2Balance);

        const checkCard2 = await cardModel.findById(cardEntity2.id);
        expect(checkCard2).toBeDefined();
        expect(checkCard2.totalSupply).toBe(totalSupply);
        expect(checkCard2.balances.length).toBeGreaterThan(1);
        expect(checkCard2.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const card2User2Balance = checkCard2.balances.find(balance => balance.userId.toString() === user2.id);
        expect(card2User2Balance).toBeDefined();
        expect(card2User2Balance.tokenAmount).toBe(userBalance);

        await cardsService.processBurnedTokens(network);

        const burnedAmountCard1User1 = tokensData[tokenCollection.contractId]
            .filter(t => t.user.id === user.ethAddress.toLowerCase())
            .reduce((a, b) => a + b.value, 0);
        const burnedAmountCard1User2 = tokensData[tokenCollection.contractId]
            .filter(t => t.user.id === user2.ethAddress.toLowerCase())
            .reduce((a, b) => a + b.value, 0);
        const card1NewTotalSupply = card1TotalSupply - burnedAmountCard1User1 - burnedAmountCard1User2;

        const card1AfterBurn = await cardModel.findOne({
            tokenCollectionId: tokenCollection.id,
            identifier: card.identifier
        });
        expect(card1AfterBurn).toBeDefined();
        expect(card1AfterBurn.totalSupply).toBe(card1NewTotalSupply);
        expect(card1AfterBurn.balances.length).toBeGreaterThan(1);
        expect(card1AfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(card1NewTotalSupply);

        const burnedAmountCard2 = tokensData[collectionEntity2.contractId]
            .reduce((a, b) => a + b.value, 0);
        const card2NewTotalSupply = totalSupply - burnedAmountCard2;
        const card2AfterBurn = await cardModel.findOne({
            tokenCollectionId: collectionEntity2.id,
            identifier: cardEntity2.identifier
        });
        expect(card2AfterBurn).toBeDefined();
        expect(card2AfterBurn.totalSupply).toBe(card2NewTotalSupply);
        expect(card2AfterBurn.balances.length).toBeGreaterThan(1);
        expect(card2AfterBurn.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(card2NewTotalSupply);
    });

    it('Should only increase job processing block number if tokens empty', async () => {
        jest.spyOn(subgraphService, 'getBurnedTokens').mockResolvedValue({});
        jest.spyOn(cardsService, 'burnToken');

        const job = await jobsService.getJobByType(network, JobType.burnedTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processBurnedTokens(network);

        const checkJob = await jobsService.getJobByType(network, JobType.burnedTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(cardsService.burnToken).toHaveBeenCalledTimes(0);
    });

    it('Should nothing do if processing block number null', async () => {
        jest.spyOn(jobsService, 'getProcessingBlockNumberByType').mockResolvedValue(null);
        jest.spyOn(cardsService, 'burnToken');

        await cardsService.processBurnedTokens(network);
        expect(cardsService.burnToken).toHaveBeenCalledTimes(0);
    });

    it('Should start from increased block number if prev run is ok', async () => {
        const job = await jobsService.getJobByType(network, JobType.burnedTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        jest.spyOn(cardsService, 'burnToken').mockResolvedValue(null);
        jest.spyOn(subgraphService, 'getBurnedTokens');
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(job.processingBlockNumber + 10);

        await cardsService.processBurnedTokens(network);
        expect(subgraphService.getBurnedTokens).toHaveBeenCalledWith(network, job.processingBlockNumber);

        await cardsService.processBurnedTokens(network);
        expect(subgraphService.getBurnedTokens).toHaveBeenCalledWith(network, job.processingBlockNumber + 1);
    });

    it('Should increase block number after success processing block', async () => {
        const job = await jobsService.getJobByType(network, JobType.burnedTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processBurnedTokens(network);

        const checkJob = await jobsService.getJobByType(network, JobType.burnedTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });
});
