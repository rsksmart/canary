import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";
import { RskBlockInfo, RskForkItemInfo } from "./rsk-block";

export class RangeForkInMainchain {
    public readonly startBlock: RskBlockInfo;
    public readonly endBlock: RskBlockInfo;

    constructor(_startBlock: RskBlockInfo, _endBlock: RskBlockInfo) {
        this.startBlock = _startBlock;
        this.endBlock = _endBlock;
    }

    static fromObject(rangeForkInMainchain: any): RangeForkInMainchain {
        return new RangeForkInMainchain(rangeForkInMainchain.startBlock, rangeForkInMainchain.endBlock);
    }
}

export class Fork {
    //firstDetected contains the forkDetectionData of the first element in items
    public readonly firstDetected: ForkDetectionData;
    public readonly items: ForkItem[];
    public readonly mainchainRangeWhereForkCouldHaveStarted: RangeForkInMainchain;
    private btcHeightLastTagFound: number;
    public rskHeightLastTagFound: number;

    constructor(mainchainRangeWhereForkCouldHaveStarted: RangeForkInMainchain, forkItems: ForkItem | ForkItem[]) {
        this.mainchainRangeWhereForkCouldHaveStarted = mainchainRangeWhereForkCouldHaveStarted;

        if (forkItems instanceof ForkItem) {
            this.items = [];
            this.firstDetected = forkItems.rskForkInfo.forkDetectionData;
            this.addNewForkItem(forkItems);
        } else {
            if (forkItems.length > 0) {
                let forks = forkItems.sort((x, y) => x.rskForkInfo.forkDetectionData.BN > y.rskForkInfo.forkDetectionData.BN ? 0 : 1);
                this.items = forks;
                this.firstDetected = forks[forks.length - 1].rskForkInfo.forkDetectionData;
                this.btcHeightLastTagFound = this.items[0].btcInfo.height;
                this.rskHeightLastTagFound = this.items[0].rskForkInfo.forkDetectionData.BN;
            } else {
                throw "forkItems should have at least one item"
            }
        }
    }

    static fromObject(fork: any): Fork {
        let items: ForkItem[] = [];
        fork.items.map(x => items.push(ForkItem.fromObject(x)));
        return new Fork(RangeForkInMainchain.fromObject(fork.mainchainRangeWhereForkCouldHaveStarted), items);
    }

    public addNewForkItem(fork: ForkItem) {
        this.btcHeightLastTagFound = fork.btcInfo.height;
        this.rskHeightLastTagFound = fork.rskForkInfo.forkDetectionData.BN;
        this.items.unshift(fork);
    }

    public getForkItems(): ForkItem[] {
        return this.items;
    }

    public forkLenght(): number {
        return this.items.length;
    }

    public getFirstDetected(): ForkItem {
        return this.items[this.items.length - 1];
    }

    public getLastDetected(): ForkItem {
        return this.items[0];
    }

    public getHeightForLastTagFoundInBTC() : number{
        return this.btcHeightLastTagFound;
    }
    
    public consideredStartRskBlock() : RskBlockInfo {
        const startRange: RangeForkInMainchain = this.mainchainRangeWhereForkCouldHaveStarted;
        const consideredStartBlock: RskBlockInfo = startRange.startBlock.height > 1 ? startRange.startBlock : startRange.endBlock;
        return consideredStartBlock;
    }

    public getIdentifier(){
        return `${this.btcHeightLastTagFound}-${this.rskHeightLastTagFound}`
    }
}

export class Item {
    public btcInfo?: BtcHeaderInfo;
    public rskInfo: RskBlockInfo;

    constructor(btcInfo: BtcHeaderInfo, rskBlock: RskBlockInfo) {
        this.btcInfo = btcInfo;
        this.rskInfo = rskBlock;
    }

    static fromObject(forkItem: any): Item {
        return new Item(BtcHeaderInfo.fromObject(forkItem.btcInfo), RskBlockInfo.fromObject(forkItem.rskInfo));
    }
}

export class ForkItem {
    public btcInfo: BtcHeaderInfo;
    public rskForkInfo: RskForkItemInfo;
    public time: string;

    constructor(btcInfo: BtcHeaderInfo, rskForkInfo: RskForkItemInfo, time: string) {
        this.btcInfo = btcInfo;
        this.rskForkInfo = rskForkInfo;
        this.time = time || Date();
    }

    static fromObject(forkItem: any): ForkItem {
        return new ForkItem(BtcHeaderInfo.fromObject(forkItem.btcInfo), RskForkItemInfo.fromObject(forkItem.rskForkInfo), forkItem.time);
    }
}
