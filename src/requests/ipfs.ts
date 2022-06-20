import { Request, Response } from 'express'
import { performance } from 'perf_hooks';
import { CID } from 'ipfs-http-client';
import GatewayConfig from '../config/GatewayConfig'
import http from 'http'
import assert from 'assert';
import { Client, Pool, PoolClient } from 'pg';


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


const getFollowRedirects = (url: string, resolve: (value: http.IncomingMessage) => void, reject: (reason?: any) => void) => {
    http.get(url, (res) => {
        // if any other status codes are returned, those needed to be added here
        if (res.statusCode === 301 || res.statusCode === 302) {
            assert(res.headers.location);
            return getFollowRedirects(res.headers.location, resolve, reject);
        }

        resolve(res);
    });
}

async function getResponseFollowRedirects(url: string): Promise<http.IncomingMessage> {
    return new Promise((resolve, reject) => getFollowRedirects(url, resolve, reject));
}

const ipfsUriFromParams = (params: Record<string, any>) => {
    try {
        const cid = CID.parse(params['ipfsCID']);
        const fileName = params['fileName'];

        if (fileName) return `ipfs://${cid.toString()}/${fileName}`
        else return `ipfs://${cid.toString()}`
    }
    catch (e: any) {
        throw new Error("Failed to parse CID: " + e.message);
    }
}

function localIpfsGatewayUrlFromUri(uri: string) {
    assert(uri.startsWith('ipfs://'), "invalid ipfs uri");

    // remove 'ipfs://'
    const hash = uri.slice(7);

    // re-encode uri
    const split = decodeURI(hash).split('/');
    const encodedParts = split.map((e) => { 
        return encodeURIComponent(e);
    });

    // return the processed result as a local ipfs url.
    return `http://localhost:8080/ipfs/${encodedParts.join('/')}`;
}

const setError = (e: any, res: Response) => {
    console.error("IPFS download failed: " + e.message);
    res.type('txt').status(500).send("IPFS download failed: " + e.message);
}

const checkUriAgainstDb = async (client: PoolClient, uri: string) => {
    // alt: SELECT COUNT(id) FROM item_token_metadata WHERE (artifact_uri = $1) OR (thumbnail_uri = $1) OR (display_uri = $1)
    const res = await client.query('SELECT id FROM item_token_metadata WHERE $1 IN(artifact_uri, thumbnail_uri, display_uri)', [uri])
    if (res.rows.length === 0) throw new Error("Invalid Uri");
}

export const ipfsRequest = async (req: Request, res: Response) => {
    console.log("handling ipfs download request from " + req.ip);
    const start_time = performance.now();

    try {
        const client = await pool.connect()

        try {
            const uri = ipfsUriFromParams(req.params);

            await checkUriAgainstDb(client, uri);

            const url = localIpfsGatewayUrlFromUri(uri);

            const ipfsRes = await getResponseFollowRedirects(url);

            assert(ipfsRes.statusCode);
            res.status(ipfsRes.statusCode);
            ipfsRes.pipe(res);
        }
        catch(e: any) {
            setError(e, res);
        }
        finally {
            client.release()
        }
    }
    catch(e: any) {
        setError(e, res);
    }

    console.log("ipfsRequest took " + (performance.now() - start_time).toFixed(2) + "ms");
}