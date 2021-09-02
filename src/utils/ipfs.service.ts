import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as ipfsAPI from "ipfs-api";

@Injectable()
export class IpfsService {
    private getFromIPFS;

    constructor() {
        this.getFromIPFS = promisify(ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'}).files.get);
    }

    async request<T = any>(url: string): Promise<T | null> {
        return await this.getFromIPFS(
            url.replace('ipfs://ipfs/', '')
        ).catch(() => null);
    }
}