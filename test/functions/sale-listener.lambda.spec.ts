import { Test } from '@nestjs/testing';
import { baseAppModules, baseAppProviders, clearDb, prepareJobs, randomCard, randomSale, shutdownTest } from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { Connection, Model } from 'mongoose';
import { CardSalesModule } from '../../src/cardSales/card-sales.module';
import { JobType } from '../../src/jobs/types/enums';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from '../../src/config';
import { CardSalesService } from '../../src/cardSales/card-sales.service';
import { SubgraphService } from '../../src/subgraph/subgraph.service';
import { ICardDocument } from '../../src/cards/schemas/cards.schema';
import { ICardSaleDocument } from '../../src/cardSales/schemas/card-sales.schema';
import { SaleStatus } from '../../src/cardSales/types/enums';
import { IUserDocument } from '../../src/users/schemas/user.schema';
import { JobsService } from '../../src/jobs/jobs.service';
import { CardsService } from '../../src/cards/cards.service';
import { Network } from '../../src/config/types/constants';

describe('saleListener-lambda', () => {
    let cardSalesService: CardSalesService;
    let configService: ConfigService;
    let subgraphService: SubgraphService;
    let cardsService: CardsService;
    let jobsService: JobsService;
    let app: TestingModule;
    let dbConnection: Connection;
    let saleContract: string;
    let startBlockNumber: number;
    let cardModel: Model<ICardDocument>;
    let cardSaleModel: Model<ICardSaleDocument>;
    let userModel: Model<IUserDocument>;

    const cardId = '606efcba4f95902f42a8454f';

    const makerId = '606dd633253a047743e28838';
    const makerEthAddress = 'makerEthAddress'.toLowerCase();
    const makerTokenAmount = 10;
    const orderHash = 'orderHash';

    const makerSaleTokenAmount = 3;
    const takerEthAddress = 'takerEthAddress'.toLowerCase();

    async function prepareData() {
        const card = randomCard(
            { _id: '6040f7db9f8f86d70bc97993', ethAddress: 'ethAddress' } as any,
            { _id: '6040f7db9f8f86d70bc97993' },
            { _id: '6040f7db9f8f86d70bc97993' } as any,
            false
        );

        card._id = cardId;
        card.hasSale = true;
        card.balances = [{
            userId: makerId,
            tokenAmount: makerTokenAmount,
            ethAddress: makerEthAddress,
            balanceId: 'balanceId',
        }];
        const cardsInstance = await cardModel.create(card);

        const cardSale = randomSale(cardsInstance.id, makerId, makerSaleTokenAmount);
        cardSale.orderHash = orderHash;
        await cardSaleModel.create(cardSale);
    }

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CardSalesModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        configService = app.get(ConfigService);
        cardSalesService = app.get(CardSalesService);
        subgraphService = app.get(SubgraphService);
        jobsService = app.get(JobsService);
        cardsService = app.get(CardsService);
        const blockchainConfig = configService.get<IBlockchainConfig>('blockchain');
        saleContract = blockchainConfig[Network.ETHEREUM].saleContract;
        startBlockNumber = blockchainConfig[Network.ETHEREUM].startBlock[JobType.saleListener];
        cardModel = app.get(getModelToken(DaoModelNames.card));
        cardSaleModel = app.get(getModelToken(DaoModelNames.cardSale));
        userModel = app.get(getModelToken(DaoModelNames.user));
    });

    beforeEach(async () => {
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(startBlockNumber + 1);

        jest.spyOn(subgraphService, 'getAllSellData')
            .mockResolvedValue({
                [orderHash]: {
                    blockNumber: startBlockNumber.toString(),
                    buyHash: 'buyHash',
                    sellHash: orderHash,
                    maker: { id: makerEthAddress },
                    taker: { id: takerEthAddress },
                }
            });
        await prepareJobs(
            Network.ETHEREUM,
            dbConnection,
            {
                type: JobType.saleListener,
                processingBlockNumber: startBlockNumber,
                contractAddress: saleContract
            }
        );
        await prepareData();
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('[saleListener] should change maker balance and create taker balance', async () => {
        let card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        expect(card.hasSale).toBeTruthy();

        let maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeDefined();
        expect(maker.tokenAmount).toBe(makerTokenAmount);

        let taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeUndefined();

        let sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.tokensCount).toBe(makerSaleTokenAmount);
        expect(sale.status).toBe(SaleStatus.sale);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeDefined();
        expect(maker.tokenAmount).toBe(makerTokenAmount - makerSaleTokenAmount);

        taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeDefined();
        expect(taker.tokenAmount).toBe(makerSaleTokenAmount);

        sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.status).toBe(SaleStatus.sold);

        expect(card.hasSale).toBeFalsy();
    });

    it('[saleListener] should remove maker balance and create taker balance', async () => {
        await cardSaleModel.updateOne({ cardId }, { tokensCount: makerTokenAmount });

        let card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        let maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeDefined();
        expect(maker.tokenAmount).toBe(makerTokenAmount);

        let taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeUndefined();

        let sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.tokensCount).toBe(makerTokenAmount);
        expect(sale.status).toBe(SaleStatus.sale);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeUndefined();

        taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeDefined();
        expect(taker.tokenAmount).toBe(makerTokenAmount);

        sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.status).toBe(SaleStatus.sold);
    });

    it('[saleListener] should change maker balance and change taker balance', async () => {
        const takerInstance = await userModel.create({ ethAddress: takerEthAddress });
        const takerTokenAmount = 5;
        await cardModel.findByIdAndUpdate(
            cardId,
            {
                $addToSet: {
                    balances: {
                        userId: takerInstance.id,
                        tokenAmount: takerTokenAmount,
                        ethAddress: takerEthAddress,
                        balanceId: 'balanceId',
                    }
                }
            }
        );

        let card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        let maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeDefined();
        expect(maker.tokenAmount).toBe(makerTokenAmount);

        let taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeDefined();
        expect(taker.tokenAmount).toBe(takerTokenAmount);

        let sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.tokensCount).toBe(makerSaleTokenAmount);
        expect(sale.status).toBe(SaleStatus.sale);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        card = await cardModel.findById(cardId);
        expect(card).toBeDefined();

        maker = card.balances.find(balance => balance.userId.toString() === makerId);
        expect(maker).toBeDefined();
        expect(maker.tokenAmount).toBe(makerTokenAmount - makerSaleTokenAmount);

        taker = card.balances.find(balance => balance.ethAddress === takerEthAddress);
        expect(taker).toBeDefined();
        expect(taker.tokenAmount).toBe(takerTokenAmount + makerSaleTokenAmount);

        sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.status).toBe(SaleStatus.sold);
    });

    it('[saleListener] should nothing doing if processing block number null', async () => {
        jest.spyOn(jobsService, 'getProcessingBlockNumberByType').mockResolvedValue(null);
        jest.spyOn(cardsService, 'changeOwnerships');

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);
        expect(cardsService.changeOwnerships).toHaveBeenCalledTimes(0);
    });

    it('[saleListener] should only increase job processing block number if sell data empty', async () => {
        jest.spyOn(subgraphService, 'getAllSellData').mockResolvedValue({});
        jest.spyOn(cardsService, 'changeOwnerships');

        const job = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        const checkJob = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(cardsService.changeOwnerships).toHaveBeenCalledTimes(0);
    });

    it('[saleListener] should only increase job processing block number if we dont have sales', async () => {
        jest.spyOn(cardSalesService, 'getSalesByOrderHashes').mockResolvedValue([]);
        jest.spyOn(cardsService, 'changeOwnerships');

        const job = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        const checkJob = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
        expect(cardsService.changeOwnerships).toHaveBeenCalledTimes(0);
    });

    it('[saleListener] should increase job processing block if all success', async () => {
        let sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.tokensCount).toBe(makerSaleTokenAmount);
        expect(sale.status).toBe(SaleStatus.sale);

        const job = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);

        sale = await cardSaleModel.findOne({ cardId });
        expect(sale).toBeDefined();
        expect(sale.status).toBe(SaleStatus.sold);

        const checkJob = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(checkJob).toBeDefined();
        expect(checkJob.processingBlockNumber).toBe(job.processingBlockNumber + 1);
    });

    it('[saleListener] should start from increased block number if prev run is ok', async () => {
        const job = await jobsService.getJobByType(Network.ETHEREUM, JobType.saleListener, saleContract);
        expect(job).toBeDefined();
        expect(job.processingBlockNumber).toBeGreaterThan(0);

        jest.spyOn(subgraphService, 'getAllSellData');
        jest.spyOn(subgraphService, 'getLatestBlockNumber')
            .mockResolvedValue(job.processingBlockNumber + 10);

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);
        expect(subgraphService.getAllSellData).toHaveBeenCalledWith(
            Network.ETHEREUM,
            saleContract,
            job.processingBlockNumber
        );

        await cardSalesService.processSell(Network.ETHEREUM, saleContract);
        expect(subgraphService.getAllSellData).toHaveBeenCalledWith(
            Network.ETHEREUM,
            saleContract,
            job.processingBlockNumber + 1
        );
    });
});
