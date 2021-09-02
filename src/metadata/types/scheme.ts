import { IS3File } from '../../types/scheme';

export interface IStoredTokenFiles {
    s3Image: IS3File;
    s3Animation?: IS3File;
}

export interface IBasicTokenMetadataProperties {
    [key: string]: any;
}

