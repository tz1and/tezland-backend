class ServerConfig {
    public NFTSTORAGE_API_KEY: string[];
    public UPLOAD_TO_NFT_STORAGE: boolean;
    public LOCAL_IPFS_URL: string;
    public SERVER_PORT: number;
    public CORS_ALLOW_ORIGIN: string;

    constructor() {
        if(process.env.NFTSTORAGE_API_KEY)
            this.NFTSTORAGE_API_KEY = process.env.NFTSTORAGE_API_KEY.split(',');
        else this.NFTSTORAGE_API_KEY = [];

        if(process.env.UPLOAD_TO_NFT_STORAGE !== undefined)
            this.UPLOAD_TO_NFT_STORAGE = process.env.UPLOAD_TO_NFT_STORAGE !== "0" && process.env.UPLOAD_TO_NFT_STORAGE !== "FALSE";
        else this.UPLOAD_TO_NFT_STORAGE = false;

        if(process.env.LOCAL_IPFS_URL !== undefined)
            this.LOCAL_IPFS_URL = process.env.LOCAL_IPFS_URL;
        else this.LOCAL_IPFS_URL = "";

        if(process.env.SERVER_PORT !== undefined)
            this.SERVER_PORT = parseInt(process.env.SERVER_PORT);
        else this.SERVER_PORT = 9051;

        if(process.env.CORS_ALLOW_ORIGIN)
            this.CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN;
        else this.CORS_ALLOW_ORIGIN = "";

        console.log("NFTSTORAGE_API_KEY: " + (this.NFTSTORAGE_API_KEY.length !== 0 ? "set" : "not set"))
        console.log("UPLOAD_TO_NFT_STORAGE: " + this.UPLOAD_TO_NFT_STORAGE)
        console.log("LOCAL_IPFS_URL: " + this.LOCAL_IPFS_URL)
        console.log("SERVER_PORT: " + this.SERVER_PORT)
        console.log("CORS_ALLOW_ORIGIN: " + this.CORS_ALLOW_ORIGIN)
    }
}

const config = new ServerConfig();
export default config