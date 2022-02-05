import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {  } from './storage/storage'
import { defaultRoute, uploadRequest } from './requests'
import ServerConfig from './ServerConfig'
import cluster from 'cluster'
import assert from 'assert'
import { isDev } from './utils/Utils'

if(!isDev()) assert(!cluster.isPrimary);

const server = express();

// Set up router
const router = express.Router();

// set up CORS
// TODO: proper domain for prod 
router.use(cors({
    origin: ServerConfig.CORS_ALLOW_ORIGIN
}));

// use body-parser
//router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json({limit: '200mb'}));

// the upload to nft.storage upload entry point
router.post( "/upload", uploadRequest );
//router.get( "/", defaultRoute );

server.use("/", router);

// start the Express server
server.listen( ServerConfig.SERVER_PORT, () => {
    console.log( `express worker ${process.pid} started at http://localhost:${ ServerConfig.SERVER_PORT }` );
} );

