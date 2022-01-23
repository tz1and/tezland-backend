import * as ipfs from 'ipfs-http-client';
import { Blob } from 'nft.storage';
import { performance } from 'perf_hooks';
import AppConfig from '../AppConfig';

const ipfs_client = ipfs.create({ url: AppConfig.LOCAL_IPFS_URL });

export const uploadToLocal = async (data: any): Promise<any> => {
    const start_time = performance.now()
    // first we upload every blob in the object
    for (var property in data) {
        if(data[property] instanceof Blob) {
            const blob: Blob = data[property];

            // upload to ips
            const result = await ipfs_client.add(blob);
            const path = `ipfs://${result.cid.toV1().toString()}`;

            // and set the object to be the path
            data[property] = path;
        }
    }

    // now upload the metadata:
    const metadata = JSON.stringify(data);

    const result = await ipfs_client.add(metadata);
    console.log("uploadToLocal took " + (performance.now() - start_time).toFixed(2) + "ms");

    return `ipfs://${result.cid.toV1().toString()}`;
}