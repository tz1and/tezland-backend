class ServerConfig {
    public NFTSTORAGE_API_KEY: string[];
    public UPLOAD_TO_LOCAL_IPFS: boolean;
    public LOCAL_IPFS_URL: string;
    public SERVER_PORT: number;
    public CORS_ALLOW_ORIGIN: string;
    public CLUSTER_WORKERS: number;

    constructor() {
        if(process.env.NFTSTORAGE_API_KEY)
            this.NFTSTORAGE_API_KEY = process.env.NFTSTORAGE_API_KEY.split(',');
        else this.NFTSTORAGE_API_KEY = [];

        if(process.env.UPLOAD_TO_LOCAL_IPFS !== undefined)
            this.UPLOAD_TO_LOCAL_IPFS = process.env.UPLOAD_TO_LOCAL_IPFS !== "0" && process.env.UPLOAD_TO_LOCAL_IPFS !== "FALSE";
        else this.UPLOAD_TO_LOCAL_IPFS = false;

        if(process.env.LOCAL_IPFS_URL !== undefined)
            this.LOCAL_IPFS_URL = process.env.LOCAL_IPFS_URL;
        else this.LOCAL_IPFS_URL = "";

        if(process.env.SERVER_PORT !== undefined)
            this.SERVER_PORT = parseInt(process.env.SERVER_PORT);
        else this.SERVER_PORT = 9051;

        if(process.env.CORS_ALLOW_ORIGIN)
            this.CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN;
        else this.CORS_ALLOW_ORIGIN = "";

        if(process.env.CLUSTER_WORKERS !== undefined)
            this.CLUSTER_WORKERS = parseInt(process.env.CLUSTER_WORKERS);
        else this.CLUSTER_WORKERS = 4;
    }
}

const config = new ServerConfig();

console.log("NFTSTORAGE_API_KEY: " + (config.NFTSTORAGE_API_KEY.length !== 0 ? "set" : "not set"))
console.log("UPLOAD_TO_LOCAL_IPFS: " + config.UPLOAD_TO_LOCAL_IPFS)
console.log("LOCAL_IPFS_URL: " + config.LOCAL_IPFS_URL)
console.log("SERVER_PORT: " + config.SERVER_PORT)
console.log("CORS_ALLOW_ORIGIN: " + config.CORS_ALLOW_ORIGIN)
console.log("CLUSTER_WORKERS: " + config.CLUSTER_WORKERS + "\n")

export default config