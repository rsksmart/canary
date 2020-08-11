import { getLogger, Logger } from "log4js";
import { Cerebrus, CerebrusConfig } from "./cerebrus";
import { ArmadilloApi } from "./armadillo-api";
import { Fork } from "./models/forks";

export default class ArmadilloPollingService {
    private cerebrusConfig: CerebrusConfig;
    private cerebrus: Cerebrus;
    private armadilloApi: ArmadilloApi;
    private logger: Logger;

    constructor(cerebrusConfig: CerebrusConfig, cerebrus: Cerebrus, armadilloApi: ArmadilloApi) {
        this.logger = getLogger('armadillo-polling-service');
        this.cerebrusConfig = cerebrusConfig;
        this.cerebrus = cerebrus;
        this.armadilloApi = armadilloApi;
    }

    public async start() : Promise<void> {
        this.logger.info('Starting Pooling Fork Service...');

        while (true) {
            try {
                var forks: Fork[] = await this.armadilloApi.getCurrentMainchain(this.cerebrusConfig.chainDepth);

                await this.cerebrus.processForks(forks);
            } catch (e) {
                this.logger.error(`Failed to process forks.`, e);
            }

            this.logger.info(`Waiting ${this.cerebrusConfig.pollIntervalMs}ms to make a request again...`);
            await this.sleep(this.cerebrusConfig.pollIntervalMs);
        }
    }

    private async sleep(ms) : Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}