import { Server } from "colyseus";
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