class GatewayConfig {
    public GATEWAY_SERVER_PORT: number;
    public LOCAL_IPFS_URL: string;
    public CORS_ALLOW_ORIGIN: string;
    public PG_USER: string;
    public PG_PASSWORD: string;
    public PG_HOST: string;
    public PG_PORT: number;
    public PG_DATABASE: string;
    public GATEWAY_CLUSTER_WORKERS: number;

    constructor() {
        if(process.env.GATEWAY_SERVER_PORT !== undefined)
            this.GATEWAY_SERVER_PORT = parseInt(process.env.GATEWAY_SERVER_PORT);
        else this.GATEWAY_SERVER_PORT = 9053;

        if(process.env.LOCAL_IPFS_URL !== undefined)
            this.LOCAL_IPFS_URL = process.env.LOCAL_IPFS_URL;
        else this.LOCAL_IPFS_URL = "";

        if(process.env.CORS_ALLOW_ORIGIN)
            this.CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN;
        else this.CORS_ALLOW_ORIGIN = "";

        if(process.env.PG_USER)
            this.PG_USER = process.env.PG_USER;
        else this.PG_USER = "dipdup";

        if(process.env.PG_PASSWORD)
            this.PG_PASSWORD = process.env.PG_PASSWORD;
        else this.PG_PASSWORD = "changeme";

        if(process.env.PG_HOST)
            this.PG_HOST = process.env.PG_HOST;
        else this.PG_HOST = "localhost";

        if(process.env.PG_PORT !== undefined)
            this.PG_PORT = parseInt(process.env.PG_PORT);
        else this.PG_PORT = 15435;

        if(process.env.PG_DATABASE)
            this.PG_DATABASE = process.env.PG_DATABASE;
        else this.PG_DATABASE = "dipdup";

        if(process.env.GATEWAY_CLUSTER_WORKERS !== undefined)
            this.GATEWAY_CLUSTER_WORKERS = parseInt(process.env.GATEWAY_CLUSTER_WORKERS);
        else this.GATEWAY_CLUSTER_WORKERS = 8;
    }
}

const config = new GatewayConfig();

console.log("GATEWAY_SERVER_PORT: " + config.GATEWAY_SERVER_PORT)
console.log("LOCAL_IPFS_URL: " + config.LOCAL_IPFS_URL)
console.log("CORS_ALLOW_ORIGIN: " + config.CORS_ALLOW_ORIGIN)
console.log("PG_USER: " + config.PG_USER)
console.log("PG_HOST: " + config.PG_HOST)
console.log("PG_PORT: " + config.PG_PORT)
console.log("PG_DATABASE: " + config.PG_DATABASE + "\n")

export default config