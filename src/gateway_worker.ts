import express from 'express'
import cors from 'cors'
import {  } from './storage/storage'
import { defaultRoute, ipfsRequest } from './requests'
import GatewayConfig from './config/GatewayConfig'
import cluster from 'cluster'
import assert from 'assert'
import { isDev } from './utils/Utils'

if(!isDev()) assert(!cluster.isPrimary);

const server = express();

if(isDev()) {
    console.log("Setting up CORS for dev");
    // set up CORS
    const cors_config = cors({
        origin: GatewayConfig.CORS_ALLOW_ORIGIN,
        methods: [ "POST", "GET" ]
    });

    server.use(cors_config);
    //server.options('*', cors_config);
}

// Set up router
const router = express.Router();

// the upload to nft.storage upload entry point
router.get( "/ipfs/:ipfsCID/:fileName?", ipfsRequest );
router.get( "/ipfs", defaultRoute );
router.get( "/", defaultRoute );

server.use("/", router);

// start the Express server
server.listen( GatewayConfig.GATEWAY_SERVER_PORT, () => {
    console.log(`gateway worker ${process.pid} started at http://localhost:${ GatewayConfig.GATEWAY_SERVER_PORT }`);
} );

