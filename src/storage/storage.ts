import { File, NFTStorage, Service, Token } from 'nft.storage'
import * as ipfs from 'ipfs-http-client';
import { TimeoutError } from 'ipfs-utils/src/http';
import { performance } from 'perf_hooks';
import ServerConfig from '../config/ServerConfig';
import { sleep } from '../utils/Utils';


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

// extend NFTStorage to allow us to supply our own validation while keeping
// the simplicity of the store() function.
class NFTStorageTZip extends NFTStorage {
    static override async encodeNFT(input: any) {
        validateTZip12(input)
        return Token.Token.encode(input)
    }

    static override async store(service: Service, metadata: any, options?: any) {
        const { token, car } = await NFTStorageTZip.encodeNFT(metadata)
        await NFTStorageTZip.storeCar(service, car, options)
        return token
    }

    override store(token: any, options?: any) {
        return NFTStorageTZip.store(this, token, options)
    }
}

// TODO: this is kind of a nasty workaround, but it will probably work for now :)
var request_counter: number = 0;
const nft_storage_clients: NFTStorageTZip[] = [];
for (const key of ServerConfig.NFTSTORAGE_API_KEY) {
    nft_storage_clients.push(new NFTStorageTZip({ token: key }));
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
async function get_root_file_from_dir(cid: string): Promise<string> {
    console.log("get_root_file_from_dir: ", cid)
    try {
        const ipfs_client = ipfs.create({ url: `${ServerConfig.LOCAL_IPFS_URL}:5001`, timeout: 10000 });

        const max_num_retries = 10;
        let num_retries = 0;
        while(num_retries < max_num_retries) {
            try {
                for await (const entry of ipfs_client.ls(cid)) {
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
async function resolve_path_to_cid(path: string): Promise<string> {
    console.log("resolve_path_to_cid: ", path)
    try {
        const ipfs_client = ipfs.create({ url: `${ServerConfig.LOCAL_IPFS_URL}:5001`, timeout: 10000 });

        const max_num_retries = 10;
        let num_retries = 0;
        while(num_retries < max_num_retries) {
            try {
                const resolve_result = await ipfs_client.dag.resolve(path);

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

type handlerFunction = (data: any) => Promise<ResultType>;

const uploadToNFTStorage: handlerFunction = async (data: any): Promise<ResultType> => {
    const start_time = performance.now();
    // Get client id and increase counter.
    const client_id = request_counter % nft_storage_clients.length;
    ++request_counter;
    // Store the metadata + files object.
    const metadata = await nft_storage_clients[client_id].store(data);
    // Sleep for a brief moment before calling get_root_file_from_dir.
    await sleep(250);
    // Get the root file for the directory uploaded by store.
    // it will be the direct CID for the metadata.json.
    //const file_cid = await get_root_file_from_dir(metadata.ipnft);
    const file_cid = await resolve_path_to_cid(`${metadata.ipnft}/metadata.json`);
    console.log("uploadToNFTStorage(" + client_id + ") took " + (performance.now() - start_time).toFixed(2) + "ms");

    return { metdata_uri: `ipfs://${file_cid}`, cid: file_cid };
}

const uploadToLocal = async (data: any): Promise<ResultType> => {
    const start_time = performance.now()

    const ipfs_client = ipfs.create({ url: `${ServerConfig.LOCAL_IPFS_URL}:5001`, timeout: 10000 });

    // first we upload every blob in the object
    const traverse = async (jsonObj: any) => {
        if( jsonObj !== null && typeof jsonObj == "object" ) {
            // key is either an array index or object key
            for (const [key, value] of Object.entries(jsonObj)) {
                // if it's a File, upload it.
                if(value instanceof File) {
                    const file: typeof File = value;
        
                    // upload to ips
                    const result = await ipfs_client.add(file);
                    const path = `ipfs://${result.cid.toV0().toString()}`;
        
                    // and set the object to be the path
                    jsonObj[key] = path;
                }
                else await traverse(value);
            };
        }
        else {
            // jsonObj is a number or string
        }
    }
    await traverse(data);

    // now upload the metadata:
    const metadata = JSON.stringify(data);

    const result = await ipfs_client.add(metadata);
    console.log("uploadToLocal took " + (performance.now() - start_time).toFixed(2) + "ms");

    const CIDstr = result.cid.toV0().toString();

    return { metdata_uri: `ipfs://${CIDstr}`, cid: CIDstr };
}

export const uploadToIpfs = (req_body: any): Promise<ResultType> => {
    const data = prepareData(req_body);

    const handler: handlerFunction = uploadToLocalIpfs ? uploadToLocal : uploadToNFTStorage;
    return handler(data);
}