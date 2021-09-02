import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients.module';
import { CollectiblesModule } from './collectibles/collectibles.module';

@Module({
    imports: [
        ClientsModule,
        CollectiblesModule
    ],
})
export class ExternalModule {}
