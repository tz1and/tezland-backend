import cluster from 'cluster';
import process from 'process';
import { promisify } from 'util';
import ServerConfig from "./config/ServerConfig"
import GatewayConfig from "./config/GatewayConfig"
import assert from 'assert';
import { config as dotenvFlowConfig } from 'dotenv-flow'
import { isDev } from './utils/Utils';
dotenvFlowConfig({ silent: !isDev() });

assert(cluster.isPrimary);

let expressWorkers = new Set<number>();
let gatewayWorkers = new Set<number>();

function startExpressWorker(): void {
    cluster.setupPrimary({
        exec: 'express_worker.js',
        silent: false
    });

    let worker = cluster.fork(); // express worker
    expressWorkers.add(worker.id);
}

function startWebsocketWorker(): void {
    cluster.setupPrimary({
        exec: 'websocket_worker.js',
        silent: false
    });

    cluster.fork(); // ws worker
}

function startGatewayWorker(): void {
    cluster.setupPrimary({
        exec: 'gateway_worker.js',
        silent: false
    });

    let worker = cluster.fork(); // gateway worker
    gatewayWorkers.add(worker.id);
}

console.log(`Primary ${process.pid} is running`);

// Fork express workers.
for (let i = 0; i < ServerConfig.CLUSTER_WORKERS; i++) {
    startExpressWorker();
}

// Fork gateway workers.
for (let i = 0; i < GatewayConfig.GATEWAY_CLUSTER_WORKERS; i++) {
    startGatewayWorker();
}

// Fork websocket worker.
startWebsocketWorker();

cluster.on('exit', async (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died with code ${code}. Restarting...`);

    // delay the restart by a little.
    await promisify(setTimeout)(4000);

    if (expressWorkers.has(worker.id)) { // If it was a websocket worker...
        expressWorkers.delete(worker.id);
        startExpressWorker();
    }
    else if (gatewayWorkers.has(worker.id)) { // If it was a gateway worker...
        gatewayWorkers.delete(worker.id);
        startGatewayWorker();
    }
    else { // otherwise it must have been a websocket worker...
        startWebsocketWorker();
    }
});