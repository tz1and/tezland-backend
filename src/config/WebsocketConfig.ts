class WebsocketConfig {
    public WEBSOCKET_SERVER_PORT: number;
    public CORS_ALLOW_ORIGIN: string;

    constructor() {
        if(process.env.WEBSOCKET_SERVER_PORT !== undefined)
            this.WEBSOCKET_SERVER_PORT = parseInt(process.env.WEBSOCKET_SERVER_PORT);
        else this.WEBSOCKET_SERVER_PORT = 9052;

        if(process.env.CORS_ALLOW_ORIGIN)
            this.CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN;
        else this.CORS_ALLOW_ORIGIN = "";

        console.log("WEBSOCKET_SERVER_PORT: " + this.WEBSOCKET_SERVER_PORT)
        console.log("CORS_ALLOW_ORIGIN: " + this.CORS_ALLOW_ORIGIN + "\n")
    }
}

const config = new WebsocketConfig();
export default config