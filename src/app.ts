import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { uploadToStorage } from './storage/storage'
import { defaultRoute } from './home'
import AppConfig from './AppConfig'

const app = express();

// Set up router
const router = express.Router();

// set up CORS
// TODO: proper domain for prod 
router.use(cors({
    origin: AppConfig.CORS_ALLOW_ORIGIN
}));

// use body-parser
//router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json({limit: '200mb'}));

// the upload to nft.storage upload entry point
router.post( "/upload", uploadToStorage );
//router.get( "/", defaultRoute );

app.use("/", router);

// start the Express server
app.listen( AppConfig.SERVER_PORT, () => {
    console.log( `server started at http://localhost:${ AppConfig.SERVER_PORT }` );
} );

