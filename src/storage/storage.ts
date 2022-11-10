import { CarReader, File, NFTStorage, Token } from 'nft.storage'
import { TreewalkCarJoiner } from 'carbites/treewalk'
import * as ipfs from 'ipfs-http-client';
import { TimeoutError } from 'ipfs-utils/src/http';
import { performance } from 'perf_hooks';
import ServerConfig from '../config/ServerConfig';
import assert from 'assert';


const validateTZip12 = ({ name, description, decimals }: { name: string, description: string, decimals: number}) => {
    // Just validate that expected fields are present
    if (typeof name !== 'string') {
      throw new TypeError(
        'string property `name` identifying the asset is required'
      )
    }
    if (typeof description !== 'string') {
      throw new TypeError(
        'string property `description` describing asset is required'
      )
    }
    if (typeof decimals !== 'undefined' && typeof decimals !== 'number') {
      throw new TypeError('property `decimals` must be an integer value')
    }
}

class IPFSUpload {
    private static encodeNFT(input: any) {
        return Token.Token.encode(input)
    }

    private static async storeNFTStorage(client: NFTStorage, car: CarReader, options?: any) {
        const start_time = performance.now();
        await NFTStorage.storeCar(client, car, options)
        console.log(`upload to NFTStorage took ${(performance.now() - start_time).toFixed(2)} ms`);
    }

    private static async storeLocalNode(local_client: ipfs.IPFSHTTPClient, token: Token.Token<any>, car: CarReader) {
        const start_time = performance.now();
        // Import car into local node.
        // TODO: figure out if I need to pin roots.
        const joiner = new TreewalkCarJoiner([car]);
        for await (const local_upload of local_client.dag.import(joiner.car(), { pinRoots: false })) {
            // NOTE: this won't run unless pinning is enabled.
            console.log("uploaded and pinned");
            assert(local_upload.root.cid.toString() == token.ipnft);
        }
        console.log(`upload to local ipfs took ${(performance.now() - start_time).toFixed(2)} ms`);
    }

    static async store(metadata: any, validator: (metadata: any) => void, local_client: ipfs.IPFSHTTPClient, client?: NFTStorage, options?: any) {
        // Validate token.
        validator(metadata);

        // Encode nft
        const { token, car } = await IPFSUpload.encodeNFT(metadata);

        // Upload to local node (for immediate availability).
        await IPFSUpload.storeLocalNode(local_client, token, car);

        // upload same car to NFT storage.
        if (client) await IPFSUpload.storeNFTStorage(client, car, options);

        // return token hash.
        return token;
    }
}

// TODO: this is kind of a nasty workaround, but it will probably work for now :)
var request_counter: number = 0;
const nft_storage_clients: NFTStorage[] = [];
for (const key of ServerConfig.NFTSTORAGE_API_KEY) {
    nft_storage_clients.push(new NFTStorage({ token: key }));
}
const uploadToLocalIpfs: boolean = ServerConfig.UPLOAD_TO_LOCAL_IPFS;

const fileLikeToFile = (fileLike: any): typeof File => {
    // Make sure it's a blobLike
    if(fileLike["dataUri"] === undefined)
        throw new Error("dataUri missing on fileLike: " + fileLike);

    if(fileLike["type"] === undefined)
        throw new Error("type missing on fileLike: " + fileLike);

    if(fileLike["name"] === undefined)
        throw new Error("name missing on fileLike: " + fileLike);

    const dataUri  = fileLike["dataUri"];
    const mimeType = fileLike["type"];
    const fileName = fileLike["name"];

    // TODO: this is pretty inefficient. rewrite sometime, maybe.
    // convert base64 to raw binary data held in a string
    var buf = Buffer.from(dataUri.split(',')[1], 'base64')
  
    // write the ArrayBuffer to a blob, and you're done
    var file = new File([buf], fileName, {type: mimeType});
    return file;
}

function isFileLike(input: any) {
    if(input["dataUri"] === undefined)
        return false;

    if(input["type"] === undefined)
        return false;

    if(input["name"] === undefined)
        return false;

    return true;
}

const refLikeToFile = (refLike: any, topLevel: any): typeof File => {
    // Make sure it's a refLike
    if(refLike["topLevelRef"] === undefined)
        throw new Error("topLevelRef missing on refLike: " + refLike);

    const topLevelRef = refLike["topLevelRef"];
    
    if(topLevel[topLevelRef] === undefined)
        throw new Error("topLevel data '" + topLevelRef + "' is missing for refLike: " + refLike);

    if(!(topLevel[topLevelRef] instanceof File))
        throw new Error("topLevel data '" + topLevelRef + "' not a file for refLike: " + refLike);

    return topLevel[topLevelRef];
}

function isRefLike(input: any) {
    if(input["topLevelRef"] === undefined)
        return false;

    return true;
}

function isPlainObject(input: any){
    return input && !Array.isArray(input) && typeof input === 'object';
}

const prepareData = (data: any): any => {
    // NOTE: only top level objects can be FileLike
    for (var property in data) {
        // If it's type object and a FileLike, convert it to a file.
        if(isPlainObject(data[property]) && isFileLike(data[property])) {
            data[property] = fileLikeToFile(data[property]);
        }
    }

    // TODO: make sure fileSize in formats matched the artifactUri blob

    return unreferenceData(data);
}

// Unreferences refLikes into top-level elements
const unreferenceData = (data: any): any => {
    const traverse = (jsonObj: any) => {
        if( jsonObj !== null && typeof jsonObj == "object" ) {
            // key is either an array index or object key
            Object.entries(jsonObj).forEach(([key, value]) => {
                // if it's a refLike, unreference it.
                if(isPlainObject(value) && isRefLike(value)) {
                    jsonObj[key] = refLikeToFile(value, data);
                }
                else traverse(value);
            });
        }
        else {
            // jsonObj is a number or string
        }
    }

    traverse(data);

    return data;
}


//
// Get root file from dag using ls.
//
async function get_root_file_from_dir(local_client: ipfs.IPFSHTTPClient, cid: string): Promise<string> {
    console.log("get_root_file_from_dir: ", cid)
    try {
        const max_num_retries = 10;
        let num_retries = 0;
        while(num_retries < max_num_retries) {
            try {
                for await (const entry of local_client.ls(cid)) {
                    //console.log(entry)
                    if (entry.type === 'file') {
                        return entry.cid.toString();
                    }
                }
                throw new Error("Failed to get root file from dir");
            } catch (e) {
                if (e instanceof TimeoutError) {
                    num_retries++
                    console.log("retrying ipfs.ls");
                } else {
                    throw e; // let others bubble up
                }
            }
        }
        throw new Error("Failed to get root file from dir. Retries = " + max_num_retries);
    } catch(e: any) {
        throw new Error("Failed to get root file from dir: " + e.message);
    }
}

//
// Resolve path to CID using dag.resolve.
//
async function resolve_path_to_cid(local_client: ipfs.IPFSHTTPClient, path: string): Promise<string> {
    console.log("resolve_path_to_cid: ", path)
    try {
        const max_num_retries = 10;
        let num_retries = 0;
        while(num_retries < max_num_retries) {
            try {
                const resolve_result = await local_client.dag.resolve(path);

                // If there's a remainder path, something probably went wrong.
                if (resolve_result.remainderPath && resolve_result.remainderPath.length > 0)
                    throw new Error("Remainder path: " + resolve_result.remainderPath);

                return resolve_result.cid.toString();
            } catch (e) {
                if (e instanceof TimeoutError) {
                    num_retries++
                    console.log("retrying ipfs.dag.resolve");
                } else {
                    throw e; // let others bubble up
                }
            }
        }
        throw new Error("Retries = " + max_num_retries);
    } catch(e: any) {
        throw new Error("Failed to resolve path: " + e.message);
    }
}

//
// Upload handlers
//

type ResultType = {
    metdata_uri: string,
    cid: string,
}

export const uploadToIpfs = async (req_body: any): Promise<ResultType> => {
    const data = prepareData(req_body);

    const client = uploadToLocalIpfs ? undefined : (() => {
        // Get client id and increase counter.
        const client_id = request_counter % nft_storage_clients.length;
        ++request_counter;
        return nft_storage_clients[client_id];
    })()

    // Create ipfs http client.
    const local_client = ipfs.create({ url: `${ServerConfig.LOCAL_IPFS_URL}:5001`, timeout: 30000 });
    
    // Upload to local and maybe NFT storage.
    const metadata = await IPFSUpload.store(data, validateTZip12, local_client, client);

    // Get cid of metadata file.
    const file_cid = await resolve_path_to_cid(local_client, `${metadata.ipnft}/metadata.json`);

    return { metdata_uri: `ipfs://${file_cid}`, cid: file_cid };
}
