import { configure, getLogger } from 'log4js';
import { AlertSender, MailAlertSender } from './common/alert-sender';
import { ArmadilloApi, ArmadilloApiImpl } from './common/armadillo-api';
import { Cerebrus, CerebrusConfig } from './common/cerebrus';
import ForkEmailBuilderImpl, { ForkEmailBuilder } from './common/fork-email-builder';
import { ForkInformationBuilder, ForkInformationBuilderImpl } from './common/fork-information-builder';
import { DefconLevel } from './common/defcon-level';
import ArmadilloPollingService from './common/armadillo-polling-service';
import { NotificationService } from './common/notification-service';
import { RskApiConfig } from './common/config/rsk-api-config';
import { MongoConfig } from './common/config/mongo-config';
import { MongoStore } from './common/storage/mongo-store';
import { RskApiService } from './common/service/rsk-api-service';

const logger = getLogger('main');

async function main() {
    configure('./log-config.json');

    const cerebrusConfig: CerebrusConfig = require('../config.json');
    logger.debug('Loaded config: ', cerebrusConfig);

    const defconLevels: DefconLevel[] = loadDefconLevels();
    logger.debug('Loaded defcon levels: ', defconLevels.map(d => d.getName()));

    const rskApiService: RskApiService = new RskApiService(new RskApiConfig(cerebrusConfig.rskNodeUrl, 0));
    const armadilloApi: ArmadilloApi = new ArmadilloApiImpl(cerebrusConfig.armadilloUrl);
    const forkInformationBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApiService, armadilloApi, cerebrusConfig);
    const forkEmailBuilder: ForkEmailBuilder = new ForkEmailBuilderImpl();
    const alertSender: AlertSender = new MailAlertSender(cerebrusConfig);
    const mongoConf: MongoConfig = new MongoConfig(cerebrusConfig.store.auth, cerebrusConfig.store.host, cerebrusConfig.store.port, cerebrusConfig.store.databaseName, cerebrusConfig.store.collections.forkNotification)
    const mongoDb = new MongoStore(mongoConf);
    const notificationService: NotificationService = new NotificationService(mongoDb);
    await notificationService.connect();
    const cerebrus: Cerebrus = new Cerebrus(cerebrusConfig, alertSender, forkInformationBuilder, defconLevels, forkEmailBuilder, notificationService);
    const pollingService: ArmadilloPollingService = new ArmadilloPollingService(cerebrusConfig, cerebrus, armadilloApi);

    pollingService.start();
}

function loadDefconLevels(): DefconLevel[] {
    const levels: any[] = require('../defcon-levels.json');

    return levels.map(l => new DefconLevel(l.level, l.name, l.forkLengthThreshold, l.hashrateThreshold,
        l.distanceToBestBlockThreshold, l.btcBlocksThreshold, l.recipients))
}

main();

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    process.exit(1);
})

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    process.exit(1);
})
