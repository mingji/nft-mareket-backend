import { Injectable, Inject } from "@nestjs/common";
import axios from 'axios';
import { UtilsService } from '../utils/utils.service';
import { validate as validateSchema } from 'jsonschema'
import { EIP_1155_SCHEMA } from "./json-schemas/eip-1155";
import { EIP_721_SCHEMA } from "./json-schemas/eip-721";
import { HTTP_SERVICE, HttpService } from '../utils/http.service';
import { IpfsService } from '../utils/ipfs.service';
import { IEipMetadata } from './types/eip';
import { EIP } from '../config/types/constants';

@Injectable()
export class MetadataService {
    @Inject(HTTP_SERVICE) private httpService: HttpService

    constructor (
        private readonly utilsService: UtilsService,
        private readonly ipfsService: IpfsService
    ) {}

    isValidMetadata (eipVersion: EIP, metadata: any) {
        if (!metadata) {
            return false;
        }
        switch (eipVersion) {
            case EIP.EIP_1155:
                return validateSchema(metadata, EIP_1155_SCHEMA).errors.length === 0;
            case EIP.EIP_721:
                return validateSchema(metadata, EIP_721_SCHEMA).errors.length === 0;
            default:
                return false;
        }
    }

    async fetchMetadata (eipVersion: EIP, URI: string): Promise<IEipMetadata | null> {
        let metadata = null;
        if (this.utilsService.isIPFSURI(URI)) {
            const ipfsContent = await this.ipfsService.request(URI);
            try {
                metadata = ipfsContent ? JSON.parse(ipfsContent[0].content.toString('utf-8')) : null;
            } catch(e) {
                metadata = null;
            }
        }
        if (this.utilsService.isLinkURI(URI)) {
            const response = await axios.get(URI, { headers: { 'Content-Type': 'application/json' } }).catch(() => null);
            metadata = response ? response.data : null;
        }
        // TODO handle isJSONURI case
        return this.isValidMetadata(eipVersion, metadata) ? metadata : null;
    }
}