import { Request, Response } from 'express'
import { Blob, NFTStorage, Service, Token } from 'nft.storage'
import AppConfig from '../AppConfig';
import { uploadToLocal } from './localipfs';

const validateTZip21 = ({ name, description, decimals }: { name: string, description: string, decimals: number}) => {
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

// extend NFTStorage to allow us to skip erc1155 check
class NFTStorageTZip extends NFTStorage {
    static override async encodeNFT(input: any) {
        validateTZip21(input)

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

const client = new NFTStorageTZip({ token: AppConfig.NFTSTORAGE_API_KEY })
const useLocalIpfs: boolean = AppConfig.USE_LOCAL_IPFS;

type handlerFunction = (data: any) => Promise<any>;

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

const prepareData = (data: any): Promise<any> => {
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

    return data;
}

const uploadToNFTStorage: handlerFunction = async (data: any): Promise<string> => {
    const metadata = await client.store(data);

    return metadata.url;
}

export const uploadToStorage = async (req: Request, res: Response) => {
    console.log("handling upload to ipfs request from " + req.ip);

    try {
        const data = prepareData(req.body);

        const func: handlerFunction = useLocalIpfs ? uploadToLocal : uploadToNFTStorage;
        res.status(200).json({ metdata_uri: await func(data) });
    }
    catch(e: any) {
        console.error("ipfs upload failed: " + e.message);
        res.status(500).json({ error: e.message });
    }
}