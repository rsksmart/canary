export class AuthConfig {
    public user: string;
    public password: string;

    public constructor(user: string, password: string) {
        this.user = user;
        this.password = password;
    }

    public static fromObject(auth: any): AuthConfig {
        return new AuthConfig(auth.user, auth.password);
    }
}

export class MongoConfig {
    public auth: AuthConfig;
    public host: string;
    public port: string;
    public databaseName: string;
    public collectionName: string;

    public constructor(auth: AuthConfig, host: string, port: string, databaseName: string, collectionName: string) {
        this.auth = auth;
        this.host = host;
        this.port = port;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }
}