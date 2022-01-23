import cluster from 'cluster';
import process from 'process';
import { promisify } from 'util';
import ServerConfig from "./ServerConfig"
import assert from 'assert';

assert(cluster.isPrimary);

let websocketWorkers = new Set<number>();

function startWebsocketWorker(): void {
    cluster.setupPrimary({
        exec: 'express_worker.js',
        silent: false
    });

    let worker = cluster.fork(); // ws worker
    websocketWorkers.add(worker.id);
}

console.log(`Primary ${process.pid} is running`);

// Fork express workers.
for (let i = 0; i < ServerConfig.CLUSTER_WORKERS; i++) {
    startWebsocketWorker();
}

cluster.on('exit', async (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died with code ${code}. Restarting...`);

    // delay the restart by a little.
    await promisify(setTimeout)(4000);

    if (websocketWorkers.has(worker.id)) { // If it was a websocket worker...
        websocketWorkers.delete(worker.id);
        startWebsocketWorker();
    }
});