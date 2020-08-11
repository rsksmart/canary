import { expect } from "chai";
import "mocha";
import { DefconLevel } from "../../src/common/defcon-level";
import { ForkInformation } from "../../src/common/fork-information-builder";
import { BtcHeaderInfo } from "../../src/common/models/btc-block";
import { ForkItem, Fork } from "../../src/common/models/forks";
import { RskForkItemInfo } from "../../src/common/models/rsk-block";
import { ForkDetectionData } from "../../src/common/models/fork-detection-data";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0

function buildInfo(params : any) : ForkInformation {
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
        fork: new Fork(null, [
            new ForkItem(
                new BtcHeaderInfo(1, '', ''),
                new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000001"), 2),
                Date()
            )
        ]),
        nBlocksForBtcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchainDuringFork: 1,
        endingRskHeight: 1,
        btcForkBlockPercentageOverMergeMiningBlocks: 0,
        estimatedTimeFor4000Blocks: new Date()
    }, params);
}

describe("DefconLevel", () => {
    it("active when all criteria are met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.true;
    })

    it("inactive when no criteria are met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 1,
            btcForkBlockPercentageOverMergeMiningBlocks: 0,
            bestBlockInRskInThatMoment: 1000000,
            endingRskHeight: 1,
            forkBTCitemsLength: 1
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("inactive when fork length criteria is not met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 450,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("inactive when hashrate criteria is not met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.45,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("inactive when distance to best block criteria is not met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.5,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 1000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("inactive when btc block count criteria is not met", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 6000, 2, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.5,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 1
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })
})