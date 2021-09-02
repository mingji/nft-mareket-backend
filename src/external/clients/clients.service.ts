import { Injectable } from '@nestjs/common';
import { MongooseService } from '../../dao/mongoose/mongoose.service';
import { ClientDao } from './dao/client.dao';
import { IClientDocument } from './schemas/client.schema';
import slugify from 'slugify';

@Injectable()
export class ClientsService extends MongooseService {
    constructor(private readonly clientDao: ClientDao) {
        super();
    }

    protected get dao(): ClientDao {
        return this.clientDao;
    }

    async findByClientId(clientId: string): Promise<IClientDocument | null> {
        return this.dao.findByClientId(clientId);
    }

    getSlugByClient(client: IClientDocument): string {
        return slugify(`${client.name}-${client.clientId}`);
    }
}
