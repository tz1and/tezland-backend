import assert from 'assert';
import * as ipfs from 'ipfs-http-client';
import { Blob } from 'nft.storage';
import { performance } from 'perf_hooks';
import ServerConfig from '../ServerConfig';

export const ipfs_client = ipfs.create({ url: ServerConfig.LOCAL_IPFS_URL });

export const uploadToLocal = async (data: any): Promise<{ metdata_uri: string, cid: string }> => {
    if(!ipfs_client) {
        assert(false, "uploadToLocal called but ipfs client is null");
    }

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