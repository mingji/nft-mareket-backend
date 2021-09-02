import * as mongoose from 'mongoose';
import { DaoIds } from '../../types/constants';
import { ISchemaQuery, schemaCreator } from '../../helpers/schema-creator';
import { EncryptedSchema, IEncryptedData } from '../../types/scheme';
import { WalletType } from '../types/sign-scheme';

export interface IUserSignatureRequestDocument extends mongoose.Document {
    readonly requestId: string;
    readonly message: IEncryptedData;
    readonly expireAt: Date;
    readonly walletType: WalletType;
}

export type IUserSignatureRequestLeanDocument = mongoose.LeanDocument<IUserSignatureRequestDocument>;

export type IUserSignatureRequestQuery<T> = ISchemaQuery<T, IUserSignatureRequestDocument>;

const Schema = schemaCreator(
    {
        expireAt: {
            type: Date,
            required: true
        },
        requestId: {
            type: String,
            required: true
        },
        walletType: {
            type: String,
            enum: Object.values(WalletType),
            default: WalletType.Metamask
        },
        message: {
            type: EncryptedSchema,
            required: true
        }
    },
    {
        collection: DaoIds.userSignatureRequests
    }
);

export const UserSignatureRequestSchema = Schema;
