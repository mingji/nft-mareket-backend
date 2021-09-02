import { Test } from "@nestjs/testing";
import {
    baseAppModules, baseAppProviders,
    clearDb,
    COIN_MARKET_FAIL_RESPONSE,
    COIN_MARKET_SUCCESS_QUOTES_RESPONSE,
    getCard,
    IUser,
    prepareDb,
    shutdownTest
} from '../lib';
import { HttpStatus } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing/testing-module';
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DaoModelNames } from '../../src/types/constants';
import { Connection, Model } from 'mongoose';
import { ICardSaleDocument, ICardSaleLeanDocument } from '../../src/cardSales/schemas/card-sales.schema';
import { CardSalesService } from '../../src/cardSales/card-sales.service';
import { CardSalesModule } from '../../src/cardSales/card-sales.module';

describe('updateSalePrices-lambda', () => {
    let httpService: HttpService;
    let cardSalesService: CardSalesService;
    let app: TestingModule;
    let dbConnection: Connection;
    let user: IUser;
    let sale: ICardSaleLeanDocument;
    let cardSaleModel: Model<ICardSaleDocument>;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), CardSalesModule],
            providers: [...baseAppProviders()]
        }).compile();

        dbConnection = app.get(getConnectionToken());
        httpService = app.get<HttpService>(HTTP_SERVICE);
        cardSalesService = app.get(CardSalesService);
        cardSaleModel = app.get(getModelToken(DaoModelNames.cardSale));
    });

    beforeEach(async () => {
        const data = await prepareDb(app, dbConnection);
        user = data.user;
        const cardCollection = await getCard(dbConnection, user);
        sale = cardCollection.sale;
    });

    afterEach(async () => {
        await clearDb(dbConnection);
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('updateAllSalePriceUsd should update sale prices', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_SUCCESS_QUOTES_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));
        const data = response.data.data[1];

        const saleId = sale._id.toString();
        await cardSaleModel.findByIdAndUpdate(
            saleId,
            {
                $set: {
                    priceUsd: 0,
                    currency: {
                        symbol: data.symbol,
                        symbolId: data.id,
                    }
                }
            }
        );
        let saleInstance = await cardSaleModel.findById(saleId);
        expect(saleInstance).toBeDefined();
        expect(saleInstance.priceUsd).toBe(0);
        expect(saleInstance.currency.symbol).toBe(data.symbol);
        expect(saleInstance.currency.symbolId).toBe(data.id);
        await cardSalesService.updateAllSalePriceUsd();
        saleInstance = await cardSaleModel.findById(saleId);
        expect(saleInstance).toBeDefined();
        expect(saleInstance.priceUsd)
            .toBe(saleInstance.bnPrice.toNumber() * response.data.data[1].quote['USD'].price);
    });

    it('should doesnt update prices when response quotes failed', async () => {
        const response = {
            status: HttpStatus.OK,
            data: COIN_MARKET_FAIL_RESPONSE
        };
        jest.spyOn(httpService, 'request').mockReturnValue(Promise.resolve(response));

        const saleId = sale._id.toString();
        let saleInstance = await cardSaleModel.findById(saleId);
        const { priceUsd, currency: { symbol, symbolId } } = saleInstance;

        expect(saleInstance).toBeDefined();
        await cardSalesService.updateAllSalePriceUsd();
        saleInstance = await cardSaleModel.findById(saleId);
        expect(saleInstance).toBeDefined();
        expect(saleInstance.priceUsd).toBe(priceUsd);
        expect(saleInstance.currency.symbol).toBe(symbol);
        expect(saleInstance.currency.symbolId).toBe(symbolId);
    });
});