import { Cursor, FindOneOptions } from 'mongodb';
import { MongoStore } from '../storage/mongo-store';

export default abstract class BaseService {

    protected store: MongoStore;

    constructor(store: MongoStore) {
        this.store = store;
    }

    public connect(): Promise<void> {
        return this.store.connect();
    }

    public disconnect() {
        this.store.disconnect();
    }

    protected find(filters?: any): Cursor {
        return this.store.getCollection().find(filters || {}).project({ _id: 0 });
    } 

    protected findOne(filters?: any): Promise<any> {
        const options: FindOneOptions = {
            projection: {
                _id: 0
            }
        }

        return this.store.getCollection().findOne(filters || {}, options);
    }

    public createIndex(fields: any, opts: any): void {
        this.store.getCollection().createIndex(fields, opts);
    }

    public getName(): string {
        return  this.store.getName();
    }
}