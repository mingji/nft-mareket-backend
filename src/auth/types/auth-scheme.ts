import { IUserLeanDocument } from '../../users/schemas/user.schema';

export interface IJwtPayload {
    sub: string;
    sessionId: string;
}

export interface IAuthUser extends IUserLeanDocument {
    sessionId: string;
}
