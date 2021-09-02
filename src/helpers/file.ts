import * as FileType from 'file-type';
import { FileTypeResult } from 'file-type/core';
import { FileError } from '../files/files/file.error';
import { Errors } from '../files/types/errors';

export const getFileTypeFromBuffer = async (
    imageBody: Buffer | Uint8Array | ArrayBuffer
): Promise<FileTypeResult> => {
    const fileType = await FileType.fromBuffer(imageBody);
    
    if (typeof fileType === 'undefined') {
        throw new FileError(Errors.CAN_NOT_GET_FILE_TYPE);
    }
    
    return fileType;
}
