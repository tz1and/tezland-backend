import cluster from 'cluster';
import process from 'process';
import { promisify } from 'util';
import ServerConfig from "./config/ServerConfig"
import assert from 'assert';
import { config as dotenvFlowConfig } from 'dotenv-flow'
import { isDev } from './utils/Utils';
dotenvFlowConfig({ silent: !isDev() });

assert(cluster.isPrimary);

let expressWorkers = new Set<number>();

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

console.log(`Primary ${process.pid} is running`);

// Fork express workers.
for (let i = 0; i < ServerConfig.CLUSTER_WORKERS; i++) {
    startExpressWorker();
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
    } else {
        startWebsocketWorker();
    }
});