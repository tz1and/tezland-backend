import { Request, Response } from 'express'
import { performance } from 'perf_hooks';
import { CID } from 'ipfs-http-client';
import { Pool, PoolClient } from 'pg';
import GatewayConfig from '../config/GatewayConfig'
import { pipeline } from 'stream/promises';
import http from 'http'
import assert from 'assert';


// Create a pg connection pool
const pool = new Pool({
    user: GatewayConfig.PG_USER,
    password: GatewayConfig.PG_PASSWORD,
    host: GatewayConfig.PG_HOST,
    port: GatewayConfig.PG_PORT,
    database: GatewayConfig.PG_DATABASE
})

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle pg client', err)
    process.exit(1)
})


/**
 * Recursively follow redirects.
 * @param url 
 * @param resolve 
 * @param reject 
 */
const getFollowRedirects = (url: string, resolve: (value: http.IncomingMessage) => void, reject: (reason?: any) => void) => {
    http.get(url, (res) => {
        // if any other status codes are returned, those needed to be added here
        if (res.statusCode === 301 || res.statusCode === 302) {
            assert(res.headers.location);
            return getFollowRedirects(res.headers.location, resolve, reject);
        }

        resolve(res);
    }).on("error", (err) => {
        reject(err);
    });
}

/**
 * Returns a promise for following redirects.
 * @param url 
 * @returns 
 */
async function getResponseFollowRedirects(url: string): Promise<http.IncomingMessage> {
    return new Promise((resolve, reject) => getFollowRedirects(url, resolve, reject));
}

/**
 * Reconstruct IPFS URI from request params.
 * @param params 
 * @returns 
 */
export const ipfsUriFromParams = (params: Record<string, any>) => {
    try {
        const cid = CID.parse(params['ipfsCID']);
        const fileName = params['fileName'];

        if (fileName) return `ipfs://${cid.toString()}/${encodeURI(fileName)}`
        else return `ipfs://${cid.toString()}`
    }
    catch (e: any) {
        throw new Error("Failed to parse CID: " + e.message);
    }
}

/**
 * Re-encode and IPFS CID and path that will be accepted by the IPFS gateway.
 * Encodes '#', etc...
 * @param uri 
 * @returns 
 */
const decodeSplitEncodeURI = (uri: string) => {
    const split = decodeURI(uri).split('/');
    const encodedParts = split.map((e) => { 
        return encodeURIComponent(e);
    });
    return encodedParts.join('/');
}

/**
 * Convert and IPFS URI to a link to the local IPFS gateway.
 * @param uri 
 * @returns 
 */
export const localIpfsGatewayUrlFromUri = (uri: string) => {
    assert(uri.startsWith('ipfs://'), `Invalid ipfs uri: ${uri}`);

    // remove 'ipfs://'
    const hash = uri.slice(7);

    // re-encode and return uri
    return `${GatewayConfig.LOCAL_IPFS_URL}:8080/ipfs/${decodeSplitEncodeURI(hash)}`;
}

/**
 * Prints error to log and sets response text and headers if not sent yet.
 * @param message 
 * @param res 
 */
const setError = (message: string, res: Response) => {
    console.error("IPFS download failed: " + message);
    if (!res.headersSent) res.type('txt').status(500).send("IPFS download failed: " + message);
}

/**
 * Checks if an artifact/image URI is referenced in tz1and NFTs.
 * @param client 
 * @param uri 
 */
const checkUriAgainstDb = async (client: PoolClient, uri: string) => {
    // alt: SELECT COUNT(id) FROM item_token_metadata WHERE (artifact_uri = $1) OR (thumbnail_uri = $1) OR (display_uri = $1)
    const res = await client.query('SELECT id FROM item_token_metadata WHERE $1 IN(artifact_uri, thumbnail_uri, display_uri)', [uri])
    if (res.rows.length === 0) throw new Error(`Invalid Uri: ${uri}`);
}

/**
 * Handle incoming IPFS gateway-alike requests.
 * @param req 
 * @param res 
 */
export const ipfsRequest = async (req: Request, res: Response) => {
    const start_time = performance.now();

    try {
        const client = await pool.connect();

        try {
            const uri = ipfsUriFromParams(req.params);
            await checkUriAgainstDb(client, uri);

            const url = localIpfsGatewayUrlFromUri(uri);

            const ipfsRes = await getResponseFollowRedirects(url);

            assert(ipfsRes.statusCode);
            res.status(ipfsRes.statusCode);

            await pipeline(ipfsRes, res);

            console.log(`IPFS download for ${uri} finished in ${(performance.now() - start_time).toFixed(2)}ms`);
        }
        catch(e: any) {
            setError(e.message, res);
        }
        finally {
            client.release();
        }
    }
    catch(e: any) {
        setError("PoolClient failed: " + e.message, res);
    }
}