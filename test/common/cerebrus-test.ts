import { expect } from "chai";
import { randomBytes } from "crypto";
import 'mocha';
import sinon from 'sinon';
import { AlertSender, MailAlertSender } from '../../src/common/alert-sender';
import { Cerebrus, CerebrusConfig } from '../../src/common/cerebrus';
import { DefconLevel } from "../../src/common/defcon-level";
import { ForkInformation, ForkInformationBuilder, ForkInformationBuilderImpl } from '../../src/common/fork-information-builder';
import { NotificationService } from "../../src/common/notification-service";
import { stubInterface } from "ts-sinon";
import { ForkEmailBuilder } from "../../src/common/fork-email-builder";
import ForkNotification from "../../src/common/models/forkNotification";
import { RskForkItemInfo } from "../../src/common/models/rsk-block";
import { BtcHeaderInfo } from "../../src/common/models/btc-block";
import { ForkItem, Fork, RangeForkInMainchain } from "../../src/common/models/forks";
import { ForkDetectionData } from "../../src/common/models/fork-detection-data";

function buildConfig() : CerebrusConfig {
    return {
        chainDepth: 74,
        recipients: [],
        pollIntervalMs: 10000,
        minForkLength: 2,
        server: '',
        user: '',
        pass: '',
        sender: '',
        armadilloUrl: '',
        rskNodeUrl: '',
        nBlocksForBtcHashrateForRskMainchain: 144,
        store: {}
    }
}

function buildDefconLevels() : DefconLevel[] {
    return [
        new DefconLevel(1, 'low', 1, 0.0, 10000000, 1, []),
        new DefconLevel(2, 'high', 100, 0.5, 6000, 2, [])
    ]
}

function randInt(max) {
    return Math.trunc(Math.random() * max);
}

function createForkWithItems(nItems: number) : Fork {
    let items: ForkItem[] = [];

    for (let i = 0; i < nItems; i++) {
        items.push(
            new ForkItem(
                new BtcHeaderInfo(randInt(10000), '', ''), 
                new RskForkItemInfo(new ForkDetectionData(randomBytes(32).toString('hex')), randInt(10000)),
                Date())
                )
    }

    return new Fork(
            sinon.createStubInstance(RangeForkInMainchain),
            items
        )
}

function buildForkInfo(params) : ForkInformation {
    return Object.assign({
        btcGuessedMinersNames: [''],
        forkBTCitemsLength: 1,
        forkTime: '',
        distanceFromLastDetectedToBestBlock: 1,
        cpvInfo: '',
        distanceCPVtoPrevJump: 1,
        bestBlockInRskInThatMoment: 1,
        rangeWhereForkCouldHaveStarted: null,
        chainDistance: 1,
        btcListHeights: [1],
        forkLengthRskBlocks: 1,
        btcGuessedMinedInfo: [],
        minerListGuess: '',
        fork: sinon.createStubInstance(Fork),
        nBlocksForBtcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchainDuringFork: 1,
        endingRskHeight: 1,
        btcForkBlockPercentageOverMergeMiningBlocks: 0,
        estimatedTimeFor4000Blocks: new Date()
    }, params);
}

describe("Cerebrus", async () => {
    it('ignores an empty fork array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = stubInterface<MailAlertSender>();
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = stubInterface<ForkInformationBuilder>();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels(), null, null);

        cerebrus.processForks([]);

        expect(alertSender.sendAlert.called).to.be.false;
    })

    it('ignores forks with less than the minimum item count', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = stubInterface<MailAlertSender>();
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = stubInterface<ForkInformationBuilder>();
        const notificationService = stubInterface<NotificationService>();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels(), null, notificationService);
        const fork: Fork = createForkWithItems(1);

        await cerebrus.processForks([fork]);

        expect(alertSender.sendAlert.called).to.be.false;
    })

    it('sends alert for forks with the configured item count', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = stubInterface<MailAlertSender>();
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = stubInterface<ForkInformationBuilder>();
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();

        forkInfoBuilder.build.returns(Promise.resolve(buildForkInfo({
            forkLengthRskBlocks: 10000,
            btcForkBlockPercentageOverMergeMiningBlocks: 1
        })));

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels(), forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        expect(alertSender.sendAlert.calledOnce).to.be.true;
    })

    it('does not send alert for a same fork twice', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = stubInterface<MailAlertSender>();
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = stubInterface<ForkInformationBuilder>();
        const notificationService = stubInterface<NotificationService>();
        notificationService.notificationForkWasSent.onCall(0).returns(Promise.resolve(true))
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();

        forkInfoBuilder.build.returns(Promise.resolve(buildForkInfo({
            forkLengthRskBlocks: 10000,
            btcForkBlockPercentageOverMergeMiningBlocks: 1
        })));

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels(), forkEmailBuilder, notificationService);
        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);
        await cerebrus.processForks([fork]);

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledTwice).to.be.false;
    })

    it('sends alert for a fork and the base defconlevel (some parameter below higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 15,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.8,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'low');
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);
        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
        expect(alertSender.sendAlert.calledWith(undefined, expectedDefconLevel.getRecipients())).to.be.true;
    })

    it('sends alert for a fork and a higher defconlevel (all parameters above higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 150,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.8,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'high');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
        expect(alertSender.sendAlert.calledWith(undefined, expectedDefconLevel.getRecipients())).to.be.true;
    })

    it('sends alert for a fork and the base defconlevel (only one parameter above higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 1000000,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.4
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);
        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'low');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
        expect(alertSender.sendAlert.calledWith(undefined, expectedDefconLevel.getRecipients())).to.be.true;
    })

    it('sends alert for a fork and a medium defcon level', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 75,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.6
        });

        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 1, 0.0, 10000000, 1, []),
            new DefconLevel(2, 'med', 50, 0.5, 10000000, 1, []),
            new DefconLevel(3, 'high', 100, 0.5, 6000, 1, [])
        ];
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'med');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
        expect(alertSender.sendAlert.calledWith(undefined, expectedDefconLevel.getRecipients())).to.be.true;
    })

    it('uses the least priority level as fallback when a fork does not match any of the existing levels', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 3,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.2
        });

        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 5, 0.3, 10000000, 1, []),
            new DefconLevel(2, 'high', 50, 0.5, 6000, 1, []),
        ];
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'low');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledOnce).to.be.true;
        expect(forkEmailBuilder.build.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
        expect(alertSender.sendAlert.calledWith(undefined, expectedDefconLevel.getRecipients())).to.be.true;
    })

    it('Notifications were sent, do not save it', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 3,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.2
        });

        notificationService.notificationForkWasSent.resolves(true)
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 5, 0.3, 10000000, 1, []),
            new DefconLevel(2, 'high', 50, 0.5, 6000, 1, []),
        ];

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork]);

        expect(notificationService.notificationForkWasSent.calledOnce).to.be.true;
        expect(notificationService.saveForkNotifications.called).to.be.false;
        expect(notificationService.notificationForkWasSent.calledWith(fork.getIdentifier())).to.be.true;
    })

    it('3 Notifications were sent, do not save them', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 3,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.2
        });

        notificationService.notificationForkWasSent.resolves(true)
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 5, 0.3, 10000000, 1, []),
            new DefconLevel(2, 'high', 50, 0.5, 6000, 1, []),
        ];

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);

        await cerebrus.processForks([fork, fork, fork]);

        expect(notificationService.notificationForkWasSent.calledThrice).to.be.true;
        expect(notificationService.saveForkNotifications.called).to.be.false;
        expect(notificationService.notificationForkWasSent.calledWith(fork.getIdentifier())).to.be.true;
    })

    it('2 forks arrived, 1 was already notified, just save the one which was not sent', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 3,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.2
        });

        notificationService.notificationForkWasSent.onCall(0).resolves(true)
        notificationService.notificationForkWasSent.onCall(1).resolves(false)
        notificationService.notificationForkWasSent.resolves()
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 5, 0.3, 10000000, 1, []),
            new DefconLevel(2, 'high', 50, 0.5, 6000, 1, []),
        ];

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);
        const fork1: Fork = createForkWithItems(3);

        await cerebrus.processForks([fork, fork1]);

        expect(notificationService.notificationForkWasSent.calledTwice).to.be.true;
        expect(notificationService.notificationForkWasSent.calledWith(fork.getIdentifier())).to.be.true;
        expect(notificationService.notificationForkWasSent.calledWith(fork1.getIdentifier())).to.be.true;
        expect(notificationService.saveForkNotifications.calledOnce).to.be.true;

        let forkNotificatioToValidate = new ForkNotification(fork1.getIdentifier(), fork1, undefined)
        expect(notificationService.saveForkNotifications.calledWith([forkNotificatioToValidate])).to.be.true;
    })

    it('2 forks arrived, were not sent, save them', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        const notificationService = stubInterface<NotificationService>();
        const forkEmailBuilder = stubInterface<ForkEmailBuilder>();
        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 3,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.2
        });

        notificationService.notificationForkWasSent.resolves(false)
        notificationService.notificationForkWasSent.resolves()
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 5, 0.3, 10000000, 1, []),
            new DefconLevel(2, 'high', 50, 0.5, 6000, 1, []),
        ];

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels, forkEmailBuilder, notificationService);

        const fork: Fork = createForkWithItems(2);
        const fork1: Fork = createForkWithItems(3);

        await cerebrus.processForks([fork, fork1]);

        expect(notificationService.notificationForkWasSent.calledTwice).to.be.true;
        expect(notificationService.notificationForkWasSent.calledWith(fork.getIdentifier())).to.be.true;
        expect(notificationService.notificationForkWasSent.calledWith(fork1.getIdentifier())).to.be.true;
        expect(notificationService.saveForkNotifications.calledOnce).to.be.true;

        let forkNotificatioToValidate = new ForkNotification(fork.getIdentifier(), fork, undefined)
        let forkNotificatioToValidate1 = new ForkNotification(fork1.getIdentifier(), fork1, undefined)
        expect(notificationService.saveForkNotifications.calledWith([forkNotificatioToValidate, forkNotificatioToValidate1])).to.be.true;
    })

    it('constructor fails due to null defcon levels array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        
        expect(() => {
            new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, null, null, null);
        }).to.throw('No Defcon levels provided');
    })

    it('constructor fails due to empty defcon levels array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        
        expect(() => {
            new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, [], null, null);
        }).to.throw('No Defcon levels provided');
    })
})