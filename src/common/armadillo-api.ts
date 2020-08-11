import { getLogger } from "log4js";
import { Logger } from "log4js";
import { Fork, Item } from "./models/forks";
const curl = new (require('curl-request'))();

export interface ArmadilloApi {
    getCurrentMainchain(chainDepth: number) : Promise<Fork[]>;
    getLastBtcBlocksBetweenHeight(start: number, end: number) : Promise<Item[]>;
    getBtcBlocksBetweenRskHeight(start: number, end: number) : Promise<Item[]>;
}

export class ArmadilloApiImpl implements ArmadilloApi {
    private armadilloApiUrl : string;
    private logger : Logger;

    constructor (armadilloApiUrl: string) {
        this.armadilloApiUrl = armadilloApiUrl;
        this.logger = getLogger('armadillo-api');
    }
    
    async getCurrentMainchain(chainDepth : number) : Promise<Fork[]> {
        var response = await curl.get(`${this.armadilloApiUrl}/forks/getLastForks/${chainDepth}`)
            .catch((e) => {
                this.logger.error(`Fail to check for forks`);
                return { body: JSON.stringify({ data: [] }) };
            });

        return JSON.parse(response.body).data.map(x => Fork.fromObject(x));
    }

    async getLastBtcBlocksBetweenHeight(start: number, end: number) : Promise<Item[]> {
        const endpoint = `${this.armadilloApiUrl}/mainchain/getLastBtcBlocksBetweenHeight/${start}/${end}`;

        let response: any =
            await curl.get(endpoint)
                .catch((e: Error) => {
                    this.logger.error(`Fail to retrieve from ${endpoint}: ${e}`)
                    return JSON.stringify({ body: { data: [] } })
                })

        const items: Item[] = JSON.parse(response.body).data.map(i => Item.fromObject(i));
        return items;
    }

    async getBtcBlocksBetweenRskHeight(start: number, end: number) : Promise<Item[]> {
        const endpoint = `${this.armadilloApiUrl}/mainchain/getBtcBlocksBetweenRskHeight/${start}/${end}`;

        let response: any =
            await curl.get(endpoint)
                .catch((e: Error) => {
                    this.logger.error(`Fail to retrieve from ${endpoint}: ${e}`)
                    return JSON.stringify({ body: { data: [] } })
                })

        const items: Item[] = JSON.parse(response.body).data.map(i => Item.fromObject(i));
        return items;
    }
}