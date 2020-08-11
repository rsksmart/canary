import { ArmadilloApi } from "./armadillo-api";
import { CerebrusConfig } from "./cerebrus";
import { RangeForkInMainchain, Fork, Item, ForkItem } from "./models/forks";
import { RskApiService } from "./service/rsk-api-service";
import { RskBlockInfo } from "./models/rsk-block";

export interface ForkInformation {
    btcGuessedMinersNames: string[];
    forkBTCitemsLength: number;
    forkTime: string;
    distanceFromLastDetectedToBestBlock: number;
    cpvInfo: any;
    distanceCPVtoPrevJump: number;
    bestBlockInRskInThatMoment: number;
    rangeWhereForkCouldHaveStarted: RangeForkInMainchain;
    chainDistance: any;
    btcListHeights: number[];
    forkLengthRskBlocks: number;
    btcGuessedMinedInfo: GuessMinedBlockInfo[];
    minerListGuess: string;
    fork: Fork;
    nBlocksForBtcHashrateForRskMainchain: number;
    btcHashrateForRskMainchain: number;
    btcHashrateForRskMainchainDuringFork: number;
    endingRskHeight: number;
    btcForkBlockPercentageOverMergeMiningBlocks: number;
    estimatedTimeFor4000Blocks: Date;
}

export interface GuessMinedBlockInfo {
    poolName: string;
    totalPorcentageOfBlocksMined: number;
    numberOfBlocksMined: number;
}

export interface ForkInformationBuilder {
    build(fork: Fork) : Promise<ForkInformation>;
}

export class ForkInformationBuilderImpl implements ForkInformationBuilder {
    private rskApiService: RskApiService;
    private armadilloApi: ArmadilloApi;
    private cerebrusConfig: CerebrusConfig;
    
    private readonly BTC_TO_RSK_AVERAGE_RATIO = 20;

    constructor(rskApiService: RskApiService, armadilloApi: ArmadilloApi, cerebrusConfig: CerebrusConfig) {
        this.rskApiService = rskApiService;
        this.armadilloApi = armadilloApi;
        this.cerebrusConfig = cerebrusConfig;
    }

    async build(fork: Fork): Promise<ForkInformation> {
        const btcGuessedMinedInfo = this.getBtcGuessMinedInfo(fork);

        let info: ForkInformation = {
            forkBTCitemsLength: fork.items.length,
            forkTime: this.getWhenForkIsHappening(fork),
            distanceFromLastDetectedToBestBlock: this.getDistanceFromLastDetectedToBestBlock(fork),
            cpvInfo: await this.getInformationCPVDidNotMatch(fork),
            distanceCPVtoPrevJump: await this.getCPVdistanceToPreviousJump(fork),
            bestBlockInRskInThatMoment: fork.getFirstDetected().rskForkInfo.rskBestBlockHeight,
            rangeWhereForkCouldHaveStarted: fork.mainchainRangeWhereForkCouldHaveStarted,
            chainDistance: this.getChainDistance(fork),
            btcListHeights: this.getBtcListHeight(fork),
            forkLengthRskBlocks: this.getForkLengthInRskBlocks(fork),
            btcGuessedMinedInfo: btcGuessedMinedInfo,
            btcGuessedMinersNames: fork.items.map(x => x.btcInfo.guessedMiner),
            minerListGuess: this.getGuessMinedBlocksList(btcGuessedMinedInfo),
            fork: fork,
            nBlocksForBtcHashrateForRskMainchain: this.cerebrusConfig.nBlocksForBtcHashrateForRskMainchain,
            btcHashrateForRskMainchain: await this.getBtcMainchainHashrate(fork),
            btcHashrateForRskMainchainDuringFork: await this.getBtcMainchainHashrateDuringFork(fork),
            endingRskHeight: fork.getLastDetected().rskForkInfo.forkDetectionData.BN,
            btcForkBlockPercentageOverMergeMiningBlocks: await this.getBtcForkBlockPercentageOverMergeMiningBlocks(fork),
            estimatedTimeFor4000Blocks: this.getEstimatedTimeFor4000Blocks(fork)
        }

        return info;
    }
    
    getBtcGuessMinedInfo(fork: Fork): GuessMinedBlockInfo[] {
        let btcInfoList: GuessMinedBlockInfo[] = [];

        let minersJustChecked: string[] = [];
        for (var i = 0; i < fork.items.length; i++) {
            let name = fork.items[i].btcInfo.guessedMiner;

            if (!minersJustChecked.some(x => x == name)) {
                const numberOfBlocksMined = fork.items.filter(x => x.btcInfo.guessedMiner == name).length;
                
                let infoMiner: GuessMinedBlockInfo = {
                    numberOfBlocksMined: numberOfBlocksMined,
                    poolName: name,
                    totalPorcentageOfBlocksMined: numberOfBlocksMined / fork.items.length * 100
                }
                btcInfoList.push(infoMiner);
                minersJustChecked.push(name);
            }
        }

        return btcInfoList;
    }

    getWhenForkIsHappening(fork: Fork): string {
        let forkTime = "PRESENT";
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            forkTime = "FUTURE";
        }
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN < fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            forkTime = "PAST";
        }
    
        return forkTime;
    }

    getDistanceFromLastDetectedToBestBlock(fork: Fork): number {
        return Math.abs(fork.getLastDetected().rskForkInfo.rskBestBlockHeight - fork.getLastDetected().rskForkInfo.forkDetectionData.BN);
    }

    getForkLengthInRskBlocks(fork: Fork): number {
        const consideredStartBlock: RskBlockInfo = fork.consideredStartRskBlock();
        return Math.abs(fork.getLastDetected().rskForkInfo.forkDetectionData.BN - consideredStartBlock.height);
    }

    async getInformationCPVDidNotMatch(fork: Fork): Promise<any> {
        let heightToFind = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            //Future case
            heightToFind = fork.getFirstDetected().rskForkInfo.rskBestBlockHeight;
        }
    
        var block = await this.rskApiService.getBlock(heightToFind);
        let info: any = {};
        info.bytesMatch = fork.getFirstDetected().rskForkInfo.forkDetectionData.getNumberOfBytesThatCPVMatch(block.forkDetectionData);
    
        //TODO: Do we need more info ?
    
        return info;
    }

    getCPVdistanceToPreviousJump(fork: Fork): number {
        var realForkHeight = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;
        var cpvWhereForkJump = Math.floor((fork.getLastDetected().rskForkInfo.forkDetectionData.BN - 1) / 64) * 64;
        return realForkHeight - cpvWhereForkJump;
    }

    getChainDistance(fork: Fork): string {
        var chainDistance = [];
    
        for (var i = 0; i < fork.items.length; i++) {
            chainDistance.push(Math.abs(fork.items[i].rskForkInfo.forkDetectionData.BN - fork.items[i].rskForkInfo.rskBestBlockHeight))
        }
    
        return chainDistance.toString();
    }

    getBtcListHeight(fork: Fork): number[] {
        var btcHeightList = [];
    
        for (var i = 0; i < fork.items.length; i++) {
            btcHeightList.push(Math.abs(fork.items[i].btcInfo.height));
        }
    
        return btcHeightList;
    }

    getGuessMinedBlocksList(list: GuessMinedBlockInfo[]): string {
        let minerListInfo: string[] = [];
    
        for (var i = 0; i < list.length; i++) {
            minerListInfo.push(`${list[i].poolName} had mined ${list[i].totalPorcentageOfBlocksMined.toFixed(2)}% of total fork's blocks (# blocks: ${list[i].numberOfBlocksMined})`);
        }
    
        return minerListInfo.join('\n');
    }

    async getBtcMainchainHashrate(fork: Fork) : Promise<number> {
        const blocksToAccountFor: number = this.cerebrusConfig.nBlocksForBtcHashrateForRskMainchain;

        const end: number = fork.getHeightForLastTagFoundInBTC();
        const start: number = end - blocksToAccountFor;

        const items: Item[] = await this.armadilloApi.getLastBtcBlocksBetweenHeight(start, end);

        return items.length / blocksToAccountFor * 100;
    }

    async getBtcMainchainHashrateDuringFork(fork: Fork) : Promise<number> {
        let start: number = fork.consideredStartRskBlock().height;
        let end: number = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;
        let forkLength = end - start;
        let bestBlock = fork.getLastDetected().rskForkInfo.rskBestBlockHeight;
        
        //This is a FUTURE CASE
        if(end > bestBlock){
            start = bestBlock - forkLength
            end = bestBlock;
        }

        const honestBlocks: Item[] = await this.armadilloApi.getBtcBlocksBetweenRskHeight(start, end);

        // average number of rsk blocks for each btc block is 20 on average
        const expectedBtcBlocks: number = (end - start) / this.BTC_TO_RSK_AVERAGE_RATIO;

        return expectedBtcBlocks > 0 ? honestBlocks.length / expectedBtcBlocks * 100 : 0;
    }

    async getBtcForkBlockPercentageOverMergeMiningBlocks(fork: Fork) : Promise<number> {
        let start: number = fork.consideredStartRskBlock().height;
        let end: number = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;
        let forkLength = end - start;
        let bestBlock = fork.getLastDetected().rskForkInfo.rskBestBlockHeight;

        //This is a FUTURE CASE
        if(end > bestBlock){
            start = bestBlock - forkLength
            end = bestBlock;
        }

        let honestBlocks = await this.armadilloApi.getBtcBlocksBetweenRskHeight(start, end);

        const attackerBlockCount: number = fork.items.length;
        const honestBlockCount: number = honestBlocks.length;

        let totalMergedMinedblocks = attackerBlockCount + honestBlockCount
        return attackerBlockCount / totalMergedMinedblocks * 100;
    }

    getEstimatedTimeFor4000Blocks(fork: Fork) : Date {
        if (fork.items.length == 1) {
            // cannot perform an estimation with only one item
            return new Date(undefined);
        }

        const firstDetected: ForkItem = fork.getFirstDetected();
        const lastDetected: ForkItem = fork.getLastDetected();

        const lastDetectedTime = new Date(lastDetected.time);
        const firstDetectedTime = new Date(firstDetected.time);

        const timeDiff: number = lastDetectedTime.getTime() - firstDetectedTime.getTime();
        const blockDiff: number = lastDetected.rskForkInfo.forkDetectionData.BN - firstDetected.rskForkInfo.forkDetectionData.BN;

        const timePerBlock: number = timeDiff / blockDiff;

        // use a linear regression between the first detected and last detected to estimate time for 4000 blocks
        const estimatedTimestamp: number = timePerBlock * 4000 + firstDetectedTime.getTime();

        return new Date(estimatedTimestamp);
    }
}