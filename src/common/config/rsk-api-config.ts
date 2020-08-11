
export class RskApiConfig {
    public readonly completeUrl: string;
    public readonly lastBtcBlockDetectedCheckpoint: number;

    public static fromObject(config: any): RskApiConfig {
        return new RskApiConfig(
            config.completeUrl,
            config.lastBtcBlockDetectedCheckpoint
        );
    }

    constructor(completeUrl: string, lastBtcBlockDetectedCheckpoint: number) {
        this.completeUrl = completeUrl;
        this.lastBtcBlockDetectedCheckpoint = lastBtcBlockDetectedCheckpoint;
    }
}