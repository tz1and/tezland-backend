import express from 'express'
import cors from 'cors'
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import cluster from 'cluster';
import process from 'process';
import assert from 'assert';
import WebsocketConfig from './config/WebsocketConfig';
import { isDev } from './utils/Utils';
import { tz1Room } from "./multiplayer/tz1Room";

if(!isDev()) assert(!cluster.isPrimary);

const gameServer = new Server();

gameServer.listen(WebsocketConfig.WEBSOCKET_SERVER_PORT);

gameServer.define("hub", tz1Room);
gameServer.define("interior", tz1Room);

console.log(`WebSocket worker ${process.pid} started at http://localhost:${ WebsocketConfig.WEBSOCKET_SERVER_PORT }`);

// In dev, start the colyseus monitor
if(isDev()) {
    const app = express();

    if(isDev()) {
        console.log("Setting up CORS for dev");
        // set up CORS
        const cors_config = cors({
            origin: WebsocketConfig.CORS_ALLOW_ORIGIN,
            methods: [ "POST", "GET" ]
        });
    
        app.use(cors_config);
        //server.options('*', cors_config);
    }

    app.use(express.json());

    // the colyseus monitor entrypoint
    app.use("/colyseus", monitor());

    // start the Express server
    const monitorPort = WebsocketConfig.WEBSOCKET_SERVER_PORT+100;
    app.listen(monitorPort, () => {
        console.log(`Colyseus monitor ${process.pid} started at http://localhost:${monitorPort}/colyseus`);
    } );
}