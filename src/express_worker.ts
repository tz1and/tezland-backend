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

// set up CORS
// TODO: proper domain for prod 
// TODO: figure out what I mean with that. origin?
server.use(cors({
    origin: ServerConfig.CORS_ALLOW_ORIGIN
}));

// Set up router
const router = express.Router();

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

