import { ForkDetectionData } from "./fork-detection-data";

export class RskBlockInfo {
    public height: number;
    public forkDetectionData: ForkDetectionData;
    public hash: string;
    public prevHash: string;
    public mainchain: boolean;
    public miner: string;

    constructor(_height: number, _hash: string, _prevHash: string, mainchain: boolean, miner: string, _forkDetectionData: ForkDetectionData) {
        this.height = _height;
        this.hash = _hash;
        this.forkDetectionData = _forkDetectionData;
        this.prevHash = _prevHash;
        this.mainchain = mainchain;
        this.miner = miner;
    }

    public static fromObject(block: any): RskBlockInfo {
        return new RskBlockInfo(block.height, block.hash, block.prevHash, block.mainchain, block.miner, new ForkDetectionData(block.forkDetectionData));
    }
}

export class RskForkItemInfo {
    public forkDetectionData: ForkDetectionData;
    public rskBestBlockHeight: number;

    constructor(_forkDetectionData: ForkDetectionData, _rskBestBlockHeight: number) {
        this.forkDetectionData = _forkDetectionData;
        this.rskBestBlockHeight = _rskBestBlockHeight;
    }

    public static fromObject(block: any): RskForkItemInfo {
        return new RskForkItemInfo(new ForkDetectionData(block.forkDetectionData), block.rskBestBlockHeight);
    }

    public static fromForkDetectionData(rskTag: ForkDetectionData, rskBestBlockHeight: number): RskForkItemInfo {
        return new RskForkItemInfo(new ForkDetectionData(rskTag), rskBestBlockHeight);
    }
}
