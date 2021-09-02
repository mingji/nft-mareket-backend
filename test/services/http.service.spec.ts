import { Test } from "@nestjs/testing";
import { HTTP_SERVICE, HttpService } from '../../src/utils/http.service';
import { UtilsModule } from '../../src/utils/utils.module';
import { baseAppModules, baseAppProviders, shutdownTest } from '../lib';
import { HttpService as Axios, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { TestingModule } from '@nestjs/testing/testing-module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('HttpService', () => {
    let httpService: HttpService;
    let axiosHttpService: Axios;
    let dbConnection: Connection;
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [...baseAppModules(), UtilsModule],
            providers: [...baseAppProviders()]
        }).compile();

        httpService = app.get<HttpService>(HTTP_SERVICE);
        dbConnection = app.get(getConnectionToken());
        axiosHttpService = app.get(Axios);
    });

    afterAll(async () => {
        await shutdownTest(app, dbConnection);
    });

    it('should be defined', () => {
        expect(httpService).toBeDefined();
    });

    it('should return success response', async () => {
        const responseData = 'test';
        const response: AxiosResponse<any> = {
            data: responseData,
            headers: {},
            config: { url: 'url' },
            status: HttpStatus.OK,
            statusText: 'OK',
        };
        jest
            .spyOn(axiosHttpService, 'get')
            .mockImplementation(() => of(response));

        const res = await httpService.request('/test');
        expect(res.status).toBeDefined();
        expect(res.status).toBe(HttpStatus.OK);
        expect(res.data).toBeDefined();
        expect(res.data).toBe(responseData);
    });

    it('should return fail response', async () => {
        const responseData = 'NOT_FOUND';
        const response: AxiosResponse<any> = {
            data: responseData,
            headers: {},
            config: { url: 'url' },
            status: HttpStatus.NOT_FOUND,
            statusText: 'NOT_FOUND',
        };
        const errRes: AxiosError<any> = {
            message: '',
            name: '',
            stack: '',
            config: { url: 'url' },
            isAxiosError: true,
            response,
            toJSON: () => response
        };
        jest
            .spyOn(axiosHttpService, 'get')
            .mockImplementation(() => throwError(errRes));


        const res = await httpService.request('/test');

        expect(res.status).toBeDefined();
        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.data).toBeDefined();
        expect(res.data).toBe(responseData);
    });
});