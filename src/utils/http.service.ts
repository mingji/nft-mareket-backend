import { HttpStatus, Injectable, HttpService as NestHttpService } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { AxiosRequestConfig } from 'axios';

export interface IHttpResponse<T = any> {
    status: HttpStatus;
    data: T;
}

export const HTTP_SERVICE = 'http';

@Injectable()
export class HttpService {

    constructor(private httpService: NestHttpService) {}

    async request<T>(url: string, config?: AxiosRequestConfig): Promise<IHttpResponse<T> | null> {
        return this.httpService
            .get(url, config)
            .pipe(map(resp => ({ status: resp.status, data: resp.data })))
            .toPromise()
            .catch(error => {
                if (!error.response) {
                    return null;
                }

                return {
                    status: error.response.status,
                    data: error.response.data,
                }
            });
    }

    async getFileBufferFromUrl(url: string): Promise<ArrayBuffer> {
        const response = await this.httpService.axiosRef({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
        });

        return response.data;
    }
}