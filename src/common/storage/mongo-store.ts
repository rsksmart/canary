import { MongoClient, Db, Collection } from 'mongodb';
import { MongoConfig } from '../config/mongo-config';
import { getLogger, Logger } from 'log4js';

export class MongoStore {
    private db: Db;
    private path: string;
    private mongoConfig: MongoConfig
    private mongoClient: MongoClient;
    private isConnected: boolean = false;
    private TRIES: number = 3;
    private messageConnectedWasSend: boolean;
    private logger: Logger;
    private collection: Collection<any>;

    public constructor(mongoConfig: MongoConfig) {
        this.logger = getLogger("mongo-store");
        this.mongoConfig = mongoConfig;

        let authPath =  "";
        
        if(mongoConfig.auth){
            var user = encodeURIComponent(mongoConfig.auth.user);
            var password = encodeURIComponent(mongoConfig.auth.password);
            authPath = `${user}:${password}@`;
        }
        
        this.path = `mongodb://${authPath}${this.mongoConfig.host}:${this.mongoConfig.port}`;
    }

    public async disconnect(): Promise<void> {
        this.isConnected = false;

        if(this.mongoClient != null && this.mongoClient.isConnected()){
            this.logger.info(`Closing mongo ${this.getName()}`);
            this.mongoClient.close();
        }
    }

    private sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public getCollection() {
        return this.collection;
    }

    public async connect() {
        await this.tryToConnection();
    }

    public getName(): string {
        return `${this.mongoConfig.databaseName} ${this.mongoConfig.collectionName} db`;
    }

    private async tryToConnection(): Promise<void> {
        let connectionAttempt = 1;

        while (!this.isConnected && connectionAttempt <= this.TRIES) {
            await this.sleep(2000);
            await this.connectMongo();
            connectionAttempt++;
        }

        if (connectionAttempt > 3) {
            this.logger.debug(`Mongo  ${this.getName()} connection FAILED !!`);
            process.exit();
        }

        if (this.isConnected && !this.messageConnectedWasSend) {
            this.messageConnectedWasSend = true; //I'm not proud of the use of this value
            this.logger.debug(`Mongo  ${this.getName()} is connected`);
        }
    }

    private async connectMongo() {
        if (this.isConnected) {
            return;
        }

        try {
            this.mongoClient = new MongoClient(this.path, { useNewUrlParser: true });
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(this.mongoConfig.databaseName);
            this.collection = this.db.collection(this.mongoConfig.collectionName);
            this.isConnected = true;
        }
        catch (error) {
            this.logger.error(error);
        }
    }
}
