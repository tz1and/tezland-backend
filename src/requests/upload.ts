import { Request, Response } from 'express'
import { performance } from 'perf_hooks';
import { uploadToIpfs } from '../storage/storage';

export const uploadRequest = async (req: Request, res: Response) => {
    console.log("handling upload to ipfs request from " + req.ip);
    const start_time = performance.now();

    try {
        const response = await uploadToIpfs(req.body);
        //console.log(response)
        res.status(200).json(response);
    }
    catch(e: any) {
        console.error("ipfs upload failed: " + e.message);
        res.status(500).json({ error: e.message });
    }

    console.log("uploadRequest took " + (performance.now() - start_time).toFixed(2) + "ms");
}