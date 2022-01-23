import { config as dotenvFlowConfig } from 'dotenv-flow'
dotenvFlowConfig();

class AppConfig {
    public NFTSTORAGE_API_KEY: string;
    public USE_LOCAL_IPFS: boolean;
    public LOCAL_IPFS_URL: string;
    public SERVER_PORT: number;
    public CORS_ALLOW_ORIGIN: string;

    constructor() {
        if(process.env.NFTSTORAGE_API_KEY)
            this.NFTSTORAGE_API_KEY = process.env.NFTSTORAGE_API_KEY;
        else this.NFTSTORAGE_API_KEY = "";

        if(process.env.USE_LOCAL_IPFS !== undefined)
            this.USE_LOCAL_IPFS = process.env.USE_LOCAL_IPFS !== "0" && process.env.USE_LOCAL_IPFS !== "FALSE";
        else this.USE_LOCAL_IPFS = false;

        if(process.env.LOCAL_IPFS_URL !== undefined)
            this.LOCAL_IPFS_URL = process.env.LOCAL_IPFS_URL;
        else this.LOCAL_IPFS_URL = "";

        if(process.env.SERVER_PORT !== undefined)
            this.SERVER_PORT = parseInt(process.env.SERVER_PORT);
        else this.SERVER_PORT = 9051;

        if(process.env.CORS_ALLOW_ORIGIN)
            this.CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN;
        else this.CORS_ALLOW_ORIGIN = "";
    }
}

export default new AppConfig()