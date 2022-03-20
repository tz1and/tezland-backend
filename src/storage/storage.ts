import { File, NFTStorage, Service, Token } from 'nft.storage'
import * as ipfs from 'ipfs-http-client';
import { TimeoutError } from 'ipfs-utils/src/http';
import { performance } from 'perf_hooks';
import ServerConfig from '../ServerConfig';
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

    static override async store(service: Service, metadata: any) {
        const { token, car } = await NFTStorageTZip.encodeNFT(metadata)
        await NFTStorageTZip.storeCar(service, car)
        return token
    }

    override store(token: any) {
        return NFTStorageTZip.store(this, token)
    }

    /*static override async storeBlob(service: Service, blob: Blob) {
        const blockstore = new Blockstore()
        let cidString

        try {
            const { cid, car } = await NFTStorageTZip.encodeBlob(blob, { blockstore })
            await NFTStorageTZip.storeCar(service, car)
            cidString = cid.toString()
        } finally {
            await blockstore.close()
        }

        return cidString
    }*/
}

// TODO: this is kind of a nasty workaround, but it will probably work for now :)
var request_counter: number = 0;
const nft_storage_clients: NFTStorageTZip[] = [];
for (const key of ServerConfig.NFTSTORAGE_API_KEY) {
    nft_storage_clients.push(new NFTStorageTZip({ token: key }));
}
const uploadToLocalIpfs: boolean = ServerConfig.UPLOAD_TO_LOCAL_IPFS;

const fileLikeToFile = (blobLike: any): typeof File => {
    // Make sure it's a blobLike
    if(blobLike["dataUri"] === undefined)
        throw new Error("dataUri missing on fileLike: " + blobLike);

    if(blobLike["type"] === undefined)
        throw new Error("type missing on fileLike: " + blobLike);

    if(blobLike["name"] === undefined)
        throw new Error("name missing on fileLike: " + blobLike);

    const dataUri  = blobLike["dataUri"];
    const mimeType = blobLike["type"];
    const fileName = blobLike["name"];

    // TODO: this is pretty inefficient. rewrite sometime, maybe.
    // convert base64 to raw binary data held in a string
    var buf = Buffer.from(dataUri.split(',')[1], 'base64')
  
    // separate out the mime component
    // NOTE: we don't trust the mimeType in the dataUri
    //var mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0]
  
    // write the ArrayBuffer to a blob, and you're done
    var blob = new File([buf], fileName, {type: mimeType});
    return blob;
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
    // iterate over object props
    for (var property in data) {
        // if it's type object and has a "blob" prop,
        // convert it to a blob.
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

// if it's a directory path, get the root file
// and use that to mint.
async function get_root_file_from_dir(cid: string): Promise<string> {
    console.log("get_root_file_from_dir: ", cid)
    try {
        const ipfs_client = ipfs.create({ url: ServerConfig.LOCAL_IPFS_URL, timeout: 10000 });

        const max_num_retries = 5;
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
    const file_cid = await get_root_file_from_dir(metadata.ipnft);
    console.log("uploadToNFTStorage(" + client_id + ") took " + (performance.now() - start_time).toFixed(2) + "ms");

    return { metdata_uri: `ipfs://${file_cid}`, cid: file_cid };
}

const uploadToLocal = async (data: any): Promise<ResultType> => {
    const start_time = performance.now()

    const ipfs_client = ipfs.create({ url: ServerConfig.LOCAL_IPFS_URL, timeout: 10000 });

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