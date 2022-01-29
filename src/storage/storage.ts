import { Blob, NFTStorage, Service, Token } from 'nft.storage'
import * as ipfs from 'ipfs-http-client';
import { performance } from 'perf_hooks';
import ServerConfig from '../ServerConfig';


const ipfs_client = ipfs.create({ url: ServerConfig.LOCAL_IPFS_URL });

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

    static override async storeBlob(service: Service, blob: Blob) {
        const { cid, car } = await NFTStorageTZip.encodeBlob(blob)
        await NFTStorage.storeCar(service, car)
        return cid.toString()
    }
}

const client = new NFTStorageTZip({ token: ServerConfig.NFTSTORAGE_API_KEY })
const uploadToLocalIpfs: boolean = ServerConfig.UPLOAD_TO_LOCAL_IPFS;

const dataURItoBlob = (dataURI: string): Blob => {
    // TODO: this is pretty inefficient. rewrite sometime, maybe.
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);
  
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
  
    // create a view into the buffer
    var ia = new Uint8Array(ab);
  
    // set the bytes of the buffer to the correct values
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
  
    // write the ArrayBuffer to a blob, and you're done
    var blob = new Blob([ia], {type: mimeString});
    return blob;
}

function isPlainObject(input: any){
    return input && !Array.isArray(input) && typeof input === 'object';
}

const prepareData = (data: any): any => {
    // iterate over object props
    for (var property in data) {
        // if it's type object and has a "blob" prop,
        // convert it to a blob.
        if(isPlainObject(data[property])) {
            // does the dataUri property exist?
            if(data[property]["dataUri"] !== undefined) {
                const dataUri = data[property]["dataUri"];
                data[property] = dataURItoBlob(dataUri);
            }
            else throw new Error("dataUri missing on bloblike: " + property);
        }
    }

    // TODO: make sure fileSize in formats matched the artifactUri blob

    return data;
}

// if it's a directory path, get the root file
// and use that to mint.
async function get_root_file_from_dir(cid: string): Promise<string> {
    console.log("get_root_file_from_dir: ", cid)
    try {
        for await(const entry of ipfs_client.ls(cid)) {
            //console.log(entry)
            if(entry.type === 'file') {
                return entry.cid.toString();
            }
        }
        throw new Error("Failed to get root file from dir");
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
    const metadata = await client.store(data);
    const file_cid = await get_root_file_from_dir(metadata.ipnft);
    console.log("uploadToNFTStorage took " + (performance.now() - start_time).toFixed(2) + "ms");

    return { metdata_uri: `ipfs://${file_cid}`, cid: file_cid };
}

const uploadToLocal = async (data: any): Promise<ResultType> => {
    const start_time = performance.now()
    // first we upload every blob in the object
    for (var property in data) {
        if(data[property] instanceof Blob) {
            const blob: Blob = data[property];

            // upload to ips
            const result = await ipfs_client.add(blob);
            const path = `ipfs://${result.cid.toV0().toString()}`;

            // and set the object to be the path
            data[property] = path;
        }
    }

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