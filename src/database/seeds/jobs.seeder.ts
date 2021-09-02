import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import * as winston from 'winston';
import { WinstonOptionsService } from '../../logger/winston-options.service';
import { JobsService } from '../../jobs/jobs.service';
import { blockchainConfig, IBlockchainConfig } from '../../config';
import { ConfigService } from '@nestjs/config';
import { JobType } from '../../jobs/types/enums';
import { INestApplicationContext } from '@nestjs/common';
import { Network } from '../../config/types/constants';

winston.configure({ transports: WinstonOptionsService.defaultLoggerTransports() });

process.on('unhandledRejection', (reason) => {
    winston.error(`Error on jobs seed (unhandledRejection):`, reason);
});

process.on('uncaughtException', (reason) => {
    winston.error(`Error on jobs seed (uncaughtException):`, reason);
});

async function createJob(app: INestApplicationContext, network: Network, type: JobType, contract?: string) {
    const {
        [network]: { startBlock: { [type]: startBlockNumber } }
    } = app.get(ConfigService).get<IBlockchainConfig>('blockchain');

    await app.get(JobsService).createJob(
        network,
        type,
        contract,
        startBlockNumber,
        new Date()
    );
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    await Promise.all(Object.values(Network).map(async network => {
        await createJob(app, network, JobType.saleListener, blockchainConfig()[network].saleContract);
        await createJob(app, network, JobType.createdContractListener);
        await createJob(app, network, JobType.createdTokenListener);
        await createJob(app, network, JobType.burnedTokenListener);
        await createJob(app, network, JobType.transferTokenListener);
        await createJob(app, network, JobType.launchpadSaleListener);
    }));

    await app.close();
}

bootstrap().catch(reason => {
    console.log(`Error on jobs seed:`, reason);
    process.exit(1);
});
