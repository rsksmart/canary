import { ForkInformation } from "./fork-information-builder";

export class DefconLevel {
    private level: number;
    private name: string;
    private forkLengthThreshold: number;
    private hashrateThreshold: number;
    private distanceToBestBlockThreshold: number;
    private forkBTCitemsLength: number;
    private recipients: string[];

    constructor(level: number, name: string, forkLengthThreshold: number, hashrateThreshold: number, 
                distanceToBestBlockThreshold: number, forkBTCitemsLength : number, recipients: string[]) {
        this.level = level;
        this.name = name || '';
        this.forkLengthThreshold = forkLengthThreshold;
        this.hashrateThreshold = hashrateThreshold;
        this.distanceToBestBlockThreshold = distanceToBestBlockThreshold;
        this.forkBTCitemsLength = forkBTCitemsLength;
        this.recipients = recipients;
    }

    public activeFor(forkInfo: ForkInformation) : boolean {
        return  forkInfo.forkLengthRskBlocks >= this.forkLengthThreshold && 
            forkInfo.btcForkBlockPercentageOverMergeMiningBlocks >= this.hashrateThreshold &&
            Math.abs(forkInfo.bestBlockInRskInThatMoment - forkInfo.endingRskHeight) <= this.distanceToBestBlockThreshold &&
            forkInfo.forkBTCitemsLength >= this.forkBTCitemsLength;
    }

    public getLevel() : number {
        return this.level;
    }

    public getName(): string {
        return this.name;
    }

    public getRecipients(): string[] {
        return this.recipients;
    }
}