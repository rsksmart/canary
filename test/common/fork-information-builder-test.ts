import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ArmadilloApiImpl } from "../../src/common/armadillo-api";
import { ForkInformationBuilder, ForkInformationBuilderImpl, ForkInformation } from "../../src/common/fork-information-builder";
import { CerebrusConfig } from "../../src/common/cerebrus";
import { Item, RangeForkInMainchain, ForkItem, Fork } from "../../src/common/models/forks";
import { BtcHeaderInfo } from "../../src/common/models/btc-block";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/models/rsk-block";
import { ForkDetectionData } from "../../src/common/models/fork-detection-data";
import { RskApiService } from "../../src/common/service/rsk-api-service";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0

function buildConfig(nBlocksForBtcHashrateForRskMainchain = 144) : CerebrusConfig {
    return {
        chainDepth: 74,
        recipients: [],
        pollIntervalMs: 10000,
        minForkLength: 4,
        server: '',
        user: '',
        pass: '',
        sender: '',
        armadilloUrl: '',
        rskNodeUrl: '',
        nBlocksForBtcHashrateForRskMainchain: nBlocksForBtcHashrateForRskMainchain,
        store: {}
    }
}

function buildItemList(n) : Item[] {
    const list: Item[] = [];
    for (let i = 0; i < n; i++) {
        list.push(new Item(
            new BtcHeaderInfo(100 + i, '', ''),
            new RskBlockInfo(1000 + i, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))
        ));
    }
    return list;
}

describe('ForkInformationBuilder', () => {
    it("builds forkBTCitemsLength field", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: any = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns([]);
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000001"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000002"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(new BtcHeaderInfo(1000, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110), Date()),
            new ForkItem(new BtcHeaderInfo(1001, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110), Date())
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.forkBTCitemsLength).to.equal(2);
    });

    it("builds btcHashrateForRskMainchain field", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: any = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(buildItemList(36));
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000001"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000002"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(new BtcHeaderInfo(1000, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110), Date()),
            new ForkItem(new BtcHeaderInfo(1001, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110), Date())
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.nBlocksForBtcHashrateForRskMainchain).to.equal(144);
        expect(forkInfo.btcHashrateForRskMainchain).to.equal(25);
    });

    it("builds btcHashrateForRskMainchainDuringFork field", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));
        rskApi.getBestBlock.returns(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(1000, 2000).returns(Promise.resolve(buildItemList(5)));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000003e8"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000044c"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // last anomalous rsk block is at height 2000
                    2200
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        // the estimated amount of btc blocks is 50 (1 btc/20 rsk), so we expect 50 btc blocks between the rsk 1000-2000 period
        expect(forkInfo.btcHashrateForRskMainchainDuringFork).to.equal(10);
    })

    it("builds btcHashrateForRskMainchainDuringFork field in FUTURE", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));
        rskApi.getBestBlock.returns(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(200, 1200).returns(Promise.resolve(buildItemList(5)));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000003e8"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000044c"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // last anomalous rsk block is at height 2000
                    1200
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        // the estimated amount of btc blocks is 50 (1 btc/20 rsk), so we expect 50 btc blocks between the rsk 1000-2000 period
        expect(forkInfo.btcHashrateForRskMainchainDuringFork).to.equal(10);
    })

    it("builds btcForkBlockPercentageOverMergeMiningBlocks field for fork with start with cpv matches", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(1900, 2020).returns(Promise.resolve(buildItemList(3)));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1900, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1964, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        
        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2000
                ),
                Date()
            ),
            new ForkItem(
                new BtcHeaderInfo(1002, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007e4"), // last anomalous rsk block is at height 2020
                    2020
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        // expected: 2 / (2 + 3) = 2 / 5 = 0.4
        expect(forkInfo.btcForkBlockPercentageOverMergeMiningBlocks).to.equal(40);
    })

    it("builds btcForkBlockPercentageOverMergeMiningBlocks field for fork with start with no cpv matches", async () => { 
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(1, 2020).returns(Promise.resolve([]));

        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(1964, 2020).returns(Promise.resolve(buildItemList(3)));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000001"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1964, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1002, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007e4"), // last anomalous rsk block is at height 2020
                    2029
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        // expected: 1 / (1 + 3) = 1 / 4 = 0.25
        expect(forkInfo.btcForkBlockPercentageOverMergeMiningBlocks).to.equal(25);
    })

    it("builds btcForkBlockPercentageOverMergeMiningBlocks field when there are no blocks used for rsk mainchain", async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.withArgs(1900, 2020).returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1900, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1964, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2000
                ),
                Date()
            ),
            new ForkItem(
                new BtcHeaderInfo(1002, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007e4"), // last anomalous rsk block is at height 2020
                    2020
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        // expected: 2 / (2 + 0) = 2 / 2 = 1
        expect(forkInfo.btcForkBlockPercentageOverMergeMiningBlocks).to.equal(100);
    })

    it("builds getDistanceToBestBlock field when cpv match (start block height != 1)", async () => { 
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1900, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1964, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2100
                ),
                Date()
            ),
            new ForkItem(
                new BtcHeaderInfo(1002, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007e4"), // last anomalous rsk block is at height 2020
                    2120
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);
        expect(forkInfo.distanceFromLastDetectedToBestBlock).to.equal(100);
    })

    it("builds getDistanceToBestBlock field when no cpv match (start block height != 1)", async () => { 
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1950, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2000
                ),
                Date()
            ),
            new ForkItem(
                new BtcHeaderInfo(1002, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007e4"), // last anomalous rsk block is at height 2020
                    2200
                ),
                Date()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.distanceFromLastDetectedToBestBlock).to.equal(180);
    })

    it('builds estimatedTimeFor4000Blocks field when enough items', async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(2000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1950, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2015
                ),
                new Date('2020-04-01').toString()
            ),
            new ForkItem(
                new BtcHeaderInfo(1053, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "00000bb8"), // last anomalous rsk block is at height 3000
                    3002
                ),
                new Date('2020-04-02').toString()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.estimatedTimeFor4000Blocks.getTime()).to.equal(new Date('2020-04-05').getTime());
    })

    it('builds estimatedTimeFor4000Blocks field when not enough items', async () => {
        const rskApi: any = sinon.createStubInstance(RskApiService);
        rskApi.getBlock.returns(Promise.resolve(new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));
        rskApi.getBestBlock.returns(Promise.resolve(new RskBlockInfo(2000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))));

        const armadilloApi: sinon.SinonStubbedInstance<ArmadilloApiImpl> = sinon.createStubInstance(ArmadilloApiImpl);
        armadilloApi.getLastBtcBlocksBetweenHeight.returns(Promise.resolve([]));
        armadilloApi.getBtcBlocksBetweenRskHeight.returns(Promise.resolve([]));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "0000076c"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1950, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "000007ac"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);

        const fork: Fork = new Fork(range, [
            new ForkItem(
                new BtcHeaderInfo(1001, '', ''),
                new RskForkItemInfo(
                    new ForkDetectionData(PREFIX + CPV + NU + "000007d0"), // rsk block is at height 2000
                    2015
                ),
                new Date('2020-04-01').toString()
            )
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.estimatedTimeFor4000Blocks.toString()).to.equal('Invalid Date');
    })
})