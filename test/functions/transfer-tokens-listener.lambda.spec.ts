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
import { ICardSaleDocument } from '../../src/cardSales/schemas/card-sales.schema';
import { v4 as uuidv4 } from 'uuid';
import { ObjectID } from 'mongodb';
import * as faker from 'faker';

describe('transferTokensListener-lambda', () => {
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
    let fromUser: IUserDocument;
    let toUser: IUserDocument;
    let tokenCollection: ITokenCollectionDocument;
    let card: ICardDocument;

    const network = Network.MATIC;
    const contractAddress = 'contractAddress'.toLowerCase();
    const tokenIdentifier = 1;
    const totalSupply = 100;
    const creatorBalance = 50;
    const fromUserBalance = 35;
    const toUserBalance = 15;
    const transferAmount = 5;

    async function prepareData(contractId = contractAddress): Promise<{
        creator: IUserDocument,
        fromUser: IUserDocument,
        toUser: IUserDocument,
        collectionEntity: ITokenCollectionDocument,
        cardEntity: ICardDocument
    }> {
        const creator = await userModel.create({ ethAddress: uuidv4().toLowerCase() });
        const fromUser = await userModel.create({ ethAddress: uuidv4().toLowerCase() });
        const toUser = await userModel.create({ ethAddress: uuidv4().toLowerCase() });

        const collection = randomCollection(
            creator as any,
            { _id: '6040f7db9f8f86d70bc97993' } as any
        );
        collection.contractId = contractId;
        const collectionEntity = await tokenCollectionModel.create(collection);

        const card = randomCard(
            creator as any,
            collectionEntity as any,
            { _id: '6040f7db9f8f86d70bc97993' } as any
        );
        card.identifier = tokenIdentifier;
        card.totalSupply = totalSupply;
        card.balances = [
            {
                userId: creator.id,
                ethAddress: creator.ethAddress,
                tokenAmount: creatorBalance,
                balanceId: 'balanceId1'
            },
            {
                userId: fromUser.id,
                ethAddress: fromUser.ethAddress,
                tokenAmount: fromUserBalance,
                balanceId: 'balanceId2'
            },
            {
                userId: toUser.id,
                ethAddress: toUser.ethAddress,
                tokenAmount: toUserBalance,
                balanceId: 'balanceId3'
            },
        ];
        const cardEntity = await cardModel.create(card);

        return { creator, fromUser, toUser, collectionEntity, cardEntity };
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
        startBlockNumber = blockchainConfig()[network].startBlock[JobType.transferTokenListener];
    });

    beforeEach(async () => {
        await prepareJobs(
            Network.MATIC,
            dbConnection,
            {
                type: JobType.transferTokenListener,
                processingBlockNumber: startBlockNumber
            }
        );

        const data = await prepareData();
        fromUser = data.fromUser;
        toUser = data.toUser;
        tokenCollection = data.collectionEntity;
        card = data.cardEntity;

        tokensData = {
            [tokenCollection.contractId]: [
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: transferAmount,
                    from: { id: fromUser.ethAddress },
                    to: { id: toUser.ethAddress },
                },
            ]
        };

        jest.spyOn(subgraphService, 'getTransferTokens').mockResolvedValue(tokensData);
        jest.spyOn(subgraphService, 'getLatestBlockNumber').mockResolvedValue(startBlockNumber + 1);
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    async function checkPreparingData() {
        const cardEntity = await cardModel.findById(card.id);
        expect(cardEntity).toBeDefined();
        expect(cardEntity.totalSupply).toBe(totalSupply);
        expect(cardEntity.balances.length).toBeGreaterThan(1);
        expect(cardEntity.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const fromBalance = cardEntity.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(fromBalance).toBeDefined();
        expect(fromBalance.tokenAmount).toBe(fromUserBalance);
        const toBalance = cardEntity.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(toBalance).toBeDefined();
        expect(toBalance.tokenAmount).toBe(toUserBalance);
    }

    it('Should transfer token from first user to second', async () => {
        await checkPreparingData();

        await cardsService.processTransferTokens(network);

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.totalSupply).toBe(totalSupply);
        expect(checkCard.balances.length).toBeGreaterThan(1);
        expect(checkCard.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const checkFromBalance = checkCard.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(checkFromBalance).toBeDefined();
        expect(checkFromBalance.tokenAmount).toBe(fromUserBalance - transferAmount);
        const checkToBalance = checkCard.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(checkToBalance).toBeDefined();
        expect(checkToBalance.tokenAmount).toBe(toUserBalance + transferAmount);
    });

    it('Should transfer all tokens from first user to second and delete first user balance', async () => {
        tokensData = {
            [tokenCollection.contractId]: [
                {
                    contract: tokenCollection.contractId,
                    identifier: card.identifier,
                    value: fromUserBalance,
                    from: { id: fromUser.ethAddress },
                    to: { id: toUser.ethAddress },
                },
            ]
        };
        jest.spyOn(subgraphService, 'getTransferTokens').mockResolvedValue(tokensData);

        await checkPreparingData();

        await cardsService.processTransferTokens(network);

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.totalSupply).toBe(totalSupply);
        expect(checkCard.balances.length).toBeGreaterThan(1);
        expect(checkCard.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const checkFromBalance = checkCard.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(checkFromBalance).toBeUndefined();
        const checkToBalance = checkCard.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(checkToBalance).toBeDefined();
        expect(checkToBalance.tokenAmount).toBe(toUserBalance + fromUserBalance);
    });

    it('Should transfer tokens from first user to second and create second user balance', async () => {
        await cardModel.findByIdAndUpdate(card.id,
            { $pull: { balances: { userId: toUser.id } } }
        );
        await cardModel.findByIdAndUpdate(card.id,
            { $inc: { 'balances.0.tokenAmount': toUserBalance } }
        );

        const cardEntity = await cardModel.findById(card.id);
        expect(cardEntity).toBeDefined();
        expect(cardEntity.totalSupply).toBe(totalSupply);
        expect(cardEntity.balances.length).toBeGreaterThan(1);
        expect(cardEntity.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const fromBalance = cardEntity.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(fromBalance).toBeDefined();
        expect(fromBalance.tokenAmount).toBe(fromUserBalance);
        const toBalance = cardEntity.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(toBalance).toBeUndefined();

        await cardsService.processTransferTokens(network);

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.totalSupply).toBe(totalSupply);
        expect(checkCard.balances.length).toBeGreaterThan(1);
        expect(checkCard.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const checkFromBalance = checkCard.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(checkFromBalance).toBeDefined();
        expect(checkFromBalance.tokenAmount).toBe(fromUserBalance - transferAmount);
        const checkToBalance = checkCard.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(checkToBalance).toBeDefined();
        expect(checkToBalance.tokenAmount).toBe(transferAmount);
    });

    it('Should transfer tokens and remove fromUser sales', async () => {
        const salesData = [
            randomSale(card.id, fromUser.id, fromUserBalance) as any,
            randomSale(card.id, new ObjectID().toString(), 3) as any,
            randomSale(card.id, new ObjectID().toString(), 4) as any,
            randomSale(card.id, new ObjectID().toString(), 5) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: card.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);
        expect(sales.filter(sale => sale.userId.toString() === fromUser.id).length).toBeGreaterThan(0);

        await checkPreparingData();

        await cardsService.processTransferTokens(network);

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.totalSupply).toBe(totalSupply);
        expect(checkCard.balances.length).toBeGreaterThan(1);
        expect(checkCard.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
        const checkFromBalance = checkCard.balances.find(balance => balance.userId.toString() === fromUser.id);
        expect(checkFromBalance).toBeDefined();
        expect(checkFromBalance.tokenAmount).toBe(fromUserBalance - transferAmount);
        const checkToBalance = checkCard.balances.find(balance => balance.userId.toString() === toUser.id);
        expect(checkToBalance).toBeDefined();
        expect(checkToBalance.tokenAmount).toBe(toUserBalance + transferAmount);

        const checkFromUserSales = await cardSaleModel.find({ cardId: card.id });
        expect(checkFromUserSales).toBeDefined();
        expect(checkFromUserSales.length).toBeGreaterThan(0);
        expect(checkFromUserSales.filter(sale => sale.userId.toString() === fromUser.id).length).toBe(0);
    });

    it('Should transfer tokens and and doesnt remove fromUser balance with all his sale', async () => {
        const salesData = [
            randomSale(card.id, fromUser.id, 1) as any,
            randomSale(card.id, new ObjectID().toString(), 3) as any,
            randomSale(card.id, new ObjectID().toString(), 4) as any,
            randomSale(card.id, new ObjectID().toString(), 5) as any,
        ];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: card.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);
        expect(sales.filter(sale => sale.userId.toString() === fromUser.id).length).toBeGreaterThan(0);

        await cardsService.processTransferTokens(network);

        const checkSales = await cardSaleModel.find({ cardId: card.id });
        expect(checkSales).toBeDefined();
        expect(checkSales.length).toBe(salesData.length);
        expect(checkSales.filter(sale => sale.userId.toString() === fromUser.id).length).toBeGreaterThan(0);
    });

    it('Should transfer tokens and change hasSale attribute in card', async () => {
        await cardModel.findByIdAndUpdate(card.id, { hasSale: true });

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.hasSale).toBeTruthy();

        const salesData = [randomSale(checkCard.id, fromUser.id, fromUserBalance) as any];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: checkCard.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processTransferTokens(network);

        const checkCardAfterTransfer = await cardModel.findById(card.id);
        expect(checkCardAfterTransfer).toBeDefined();
        expect(checkCardAfterTransfer.hasSale).toBeFalsy();
    });

    it('Should transfer tokens and doesnt change hasSale attribute in card', async () => {
        await cardModel.findByIdAndUpdate(card.id, { hasSale: true });

        const checkCard = await cardModel.findById(card.id);
        expect(checkCard).toBeDefined();
        expect(checkCard.hasSale).toBeTruthy();

        const salesData = [randomSale(checkCard.id, fromUser.id, 1) as any];
        await cardSaleModel.insertMany(salesData);
        const sales = await cardSaleModel.find({ cardId: checkCard.id });
        expect(sales).toBeDefined();
        expect(sales.length).toBe(salesData.length);

        await cardsService.processTransferTokens(network);

        const checkCardAfterTransfer = await cardModel.findById(card.id);
        expect(checkCardAfterTransfer).toBeDefined();
        expect(checkCardAfterTransfer.hasSale).toBeTruthy();
    });

    it('Should only increase job processing block number if tokens empty', async () => {
        jest.spyOn(subgraphService, 'getTransferTokens').mockResolvedValue({});
        jest.spyOn(cardsService, 'transferToken');

        const job = await jobsService.getJobByType(network, JobType.transferTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processTransferTokens(network);

        const checkJob = await jobsService.getJobByType(network, JobType.transferTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(cardsService.transferToken).toHaveBeenCalledTimes(0);
    });

    it('Should nothing do if processing block number null', async () => {
        jest.spyOn(jobsService, 'getProcessingBlockNumberByType').mockResolvedValue(null);
        jest.spyOn(cardsService, 'transferToken');

        await cardsService.processTransferTokens(network);
        expect(cardsService.transferToken).toHaveBeenCalledTimes(0);
    });

    it('Should start from increased block number if prev run is ok', async () => {
        const job = await jobsService.getJobByType(network, JobType.transferTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        jest.spyOn(cardsService, 'transferToken').mockResolvedValue(null);
        jest.spyOn(subgraphService, 'getTransferTokens');
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(job.processingBlockNumber + 10);

        await cardsService.processTransferTokens(network);
        expect(subgraphService.getTransferTokens).toHaveBeenCalledWith(network, job.processingBlockNumber);

        await cardsService.processTransferTokens(network);
        expect(subgraphService.getTransferTokens).toHaveBeenCalledWith(network, job.processingBlockNumber + 1);
    });

    it('Should increase block number after success processing block', async () => {
        const job = await jobsService.getJobByType(network, JobType.transferTokenListener);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardsService.processTransferTokens(network);

        const checkJob = await jobsService.getJobByType(network, JobType.transferTokenListener);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });

    it(
        'Should only increase job processing block number if we dont have response collections',
        async () => {
            jest.spyOn(cardsService, 'transferToken');

            const job = await jobsService.getJobByType(network, JobType.transferTokenListener);
            expect(job).toBeDefined();
            expect(job.processingBlockNumber).toBeGreaterThan(0);

            await tokenCollectionModel.deleteMany();

            await cardsService.processTransferTokens(network);

            const checkJob = await jobsService.getJobByType(network, JobType.transferTokenListener);
            expect(checkJob).toBeDefined();
            expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
            expect(cardsService.transferToken).toHaveBeenCalledTimes(0);
        }
    );

    it(
        'Should transfer token from user to undefined user and create user instance for undefined user',
        async () => {
            const undefinedUserEthAddress = faker.finance.ethereumAddress();
            tokensData = {
                [tokenCollection.contractId]: [
                    {
                        contract: tokenCollection.contractId,
                        identifier: card.identifier,
                        value: transferAmount,
                        from: { id: fromUser.ethAddress },
                        to: { id: undefinedUserEthAddress },
                    },
                ]
            };
            jest.spyOn(subgraphService, 'getTransferTokens').mockResolvedValue(tokensData);

            await checkPreparingData();

            await cardsService.processTransferTokens(network);

            const checkCard = await cardModel.findById(card.id);
            expect(checkCard).toBeDefined();
            expect(checkCard.totalSupply).toBe(totalSupply);
            expect(checkCard.balances.length).toBeGreaterThan(1);
            expect(checkCard.balances.reduce((a, b) => a + b.tokenAmount, 0)).toBe(totalSupply);
            const checkFromBalance = checkCard.balances.find(balance => balance.userId.toString() === fromUser.id);
            expect(checkFromBalance).toBeDefined();
            expect(checkFromBalance.tokenAmount).toBe(fromUserBalance - transferAmount);
            const checkToBalance = checkCard.balances.find(balance => balance.userId.toString() === toUser.id);
            expect(checkToBalance).toBeDefined();
            expect(checkToBalance.tokenAmount).toBe(toUserBalance);

            const undefinedUser = await userModel.findOne({ ethAddress: undefinedUserEthAddress });
            expect(undefinedUser).toBeDefined();
            expect(undefinedUser.id).toBeDefined();
            expect(undefinedUser.id.length).toBeDefined();

            const checkUndefinedUserBalance = checkCard.balances.find(b => b.userId.toString() === undefinedUser.id);
            expect(checkUndefinedUserBalance).toBeDefined();
            expect(checkUndefinedUserBalance.tokenAmount).toBe(transferAmount);
        }
    );
});
