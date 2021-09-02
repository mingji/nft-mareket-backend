import { Injectable } from "@nestjs/common";

@Injectable()
export class UtilsService {
    isValidURI (URI: string | null) {
        if (URI) {
            return this.isIPFSURI(URI) || this.isJSONURI(URI) || this.isLinkURI(URI);
        }
        return false;
    }

    isIPFSURI (URI: string): boolean {
        return URI.startsWith('ipfs://');
    }
    isLinkURI (URI: string) {
        return URI.startsWith('http');
    }
    isJSONURI (URI: string) {
        return URI.endsWith('.json');
    }
}