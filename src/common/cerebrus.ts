import { getLogger, Logger } from "log4js";
import { AlertSender } from "./alert-sender";
import { DefconLevel } from "./defcon-level";
import { ForkInformation, ForkInformationBuilder } from "./fork-information-builder";
import { ForkEmail } from "./models/forkEmail";
import { ForkEmailBuilder } from "./fork-email-builder";
import ForkNotification from "./models/forkNotification";
import { NotificationService } from "./notification-service";
import { Fork } from "./models/forks";

export interface CerebrusConfig {
    chainDepth: number;
    recipients: string[];
    pollIntervalMs: number;
    minForkLength: number;
    server: string;
    user: string;
    pass: string;
    sender: string;
    armadilloUrl: string;
    rskNodeUrl: string;
    nBlocksForBtcHashrateForRskMainchain: number;
    store: any;
}

export class Cerebrus {
    private config: CerebrusConfig;
    private alertSender: AlertSender;
    private logger: Logger;
    private forkInfoBuilder: ForkInformationBuilder;
    private defconLevels: DefconLevel[];
    private notificationService: NotificationService;
    private emailBuilder: ForkEmailBuilder;

    constructor(config: CerebrusConfig, alertSender: AlertSender, forkInfoBuilder: ForkInformationBuilder,
                defconLevels: DefconLevel[], emailBuilder: ForkEmailBuilder, notificationService: NotificationService) {
        this.logger = getLogger('cerebrus');
        this.config = config;
        this.alertSender = alertSender;
        this.forkInfoBuilder = forkInfoBuilder;
        this.defconLevels = defconLevels || [];
        this.emailBuilder = emailBuilder;
        this.notificationService = notificationService;

        if (this.defconLevels.length === 0) {
            throw new Error('No Defcon levels provided');
        }
    }

    public async processForks(forks: Fork[]) : Promise<void> {

        let forksToNotify : Fork[] = await this.filterForksAlreadyNotified(forks);
        
        if (forksToNotify.length == 0) {
            this.logger.info('No forks to notify');
            return;
        }

        let notificationsSent : ForkNotification[] = [];

        for (let fork of forksToNotify) {
            const forkInfo: ForkInformation = await this.forkInfoBuilder.build(fork);
            const defconLevel: DefconLevel = this.findActiveDefconLevel(forkInfo);
            this.logger.info(`Fork detected, sending notifications to ${defconLevel.getRecipients().join(', ')}`);
            const email: ForkEmail = await this.emailBuilder.build(forkInfo, defconLevel);
            await this.alertSender.sendAlert(email, defconLevel.getRecipients());

            notificationsSent.push(new ForkNotification(fork.getIdentifier(), fork, email))
        }

        this.logger.info(`Saving fork notifications, identifiers: ${notificationsSent.map(x => x.identifier).join(", ")}`);

        await this.notificationService.saveForkNotifications(notificationsSent);
    }

    private async filterForksAlreadyNotified(forks: Fork[]): Promise<Fork[]> {
        let forksToNotify = [];
        
        for(let fork of forks){
            let wasSent = await this.notificationService.notificationForkWasSent(fork.getIdentifier());
            
            if(!wasSent && fork.items.length >= this.config.minForkLength){
                forksToNotify.push(fork);
            }
        }

        return forksToNotify
    }

    private findActiveDefconLevel(forkInfo: ForkInformation) : DefconLevel {
        // sort descending priority
        const sortedLevels: DefconLevel[] = this.defconLevels.sort((a, b) =>  b.getLevel() - a.getLevel());

        // find active level
        const activeLevel = this.defconLevels
            .filter(level => level.activeFor(forkInfo))
            .shift();

        // least priority level should be the last of the list
        const leastPriorityLevel = sortedLevels[sortedLevels.length - 1];

        // resort to least priority if no matching level
        return activeLevel || leastPriorityLevel;
    }
}