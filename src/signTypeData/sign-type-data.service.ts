import { Inject, Injectable } from '@nestjs/common';
import {
    recoverTypedSignature,
    TypedData,
    TypedMessage
} from 'eth-sig-util';
import {
    bufferToHex,
    ecrecover,
    fromRpcSig,
    pubToAddress,
    toBuffer,
    toChecksumAddress
} from 'ethereumjs-util';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';

interface MessageTypeProperty {
    name: string;
    type: string;
}

interface MessageTypes {
    EIP712Domain: MessageTypeProperty[];
    [additionalProperties: string]: MessageTypeProperty[];
}

@Injectable()
export class SignTypeDataService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    @InjectSentry()
    private readonly sentryService: SentryService;

    checkUserSignature<T extends MessageTypes>(
        data: TypedData | TypedMessage<T>,
        sig: string,
        ethAddress: string
    ): boolean {
        try {
            return toChecksumAddress(recoverTypedSignature({ data, sig })) === toChecksumAddress(ethAddress);
        } catch (exception) {
            this.sentryService.captureException(exception);
            this.logger.error('A caught error on check user signature:', exception);
            return false;
        }
    }

    checkUserSignatureByEthSign(data: string, sig: string, ethAddress: string): boolean {
        const { v, r, s } = fromRpcSig(sig);
        const pubKey = ecrecover(toBuffer(data), v, r, s);
        const addrBuf = pubToAddress(pubKey);
        const addr = bufferToHex(addrBuf);

        return toChecksumAddress(addr) === toChecksumAddress(ethAddress);
    }
}
