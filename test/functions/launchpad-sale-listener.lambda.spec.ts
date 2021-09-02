import { Test } from '@nestjs/testing';
import {
    baseAppModules,
    baseAppProviders,
} from '../lib';
import { TestingModule } from '@nestjs/testing/testing-module';
import { LaunchpadModule } from '../../src/launchpad/launchpad.module';

//TODO: need testing listener
describe('createdContractsListener-lambda', () => {
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), LaunchpadModule],
            providers: [...baseAppProviders()]
        }).compile();
    });

    beforeEach(async () => {
        //
    });

    afterEach(async () => {
        //
    });

    afterAll(async () => {
        //
    });

    it('[launchpadSaleListener] should process data', async () => {
        expect(true).toBeTruthy();
    });
});
