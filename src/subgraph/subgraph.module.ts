import { Module } from "@nestjs/common";
import { SubgraphService } from "./subgraph.service";
import { MetadataService } from "./metadata.service";
import { UtilsModule } from "../utils/utils.module";
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [UtilsModule, ConfigModule],
    providers: [SubgraphService, MetadataService],
    exports: [SubgraphService, MetadataService]
})
export class SubgraphModule {}