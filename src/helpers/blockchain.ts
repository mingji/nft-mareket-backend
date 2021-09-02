import { addHexPrefix } from 'ethereumjs-util/dist/bytes';
import { bufferToHex, privateToAddress, toBuffer } from 'ethereumjs-util';

export const getAddressFromPrivateKey = (key: string): string => {
    key = addHexPrefix(key);
    const addressBuf = privateToAddress(toBuffer(key));

    return bufferToHex(addressBuf);
}