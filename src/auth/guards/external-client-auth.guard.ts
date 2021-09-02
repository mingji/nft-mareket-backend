import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GUARD } from '../types/enums';

@Injectable()
export class ExternalClientAuthGuard extends AuthGuard(GUARD.EXTERNAL_CLIENT) {}
