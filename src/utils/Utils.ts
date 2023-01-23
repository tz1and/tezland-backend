import { parse } from 'dotenv';
import path from 'path';
import fs from 'fs';

export function loadEnv(
    mode: string,
    envDir: string
) {
    if (mode === 'local') {
        throw new Error(
            `"local" cannot be used as a mode name because it conflicts with ` +
            `the .local postfix for .env files.`,
        )
    }

    const envFiles = [
      /** default file */ `.env`,
      /** local file */ `.env.local`,
      /** mode file */ `.env.${mode}`,
      /** mode local file */ `.env.${mode}.local`,
    ]

    const parsed = Object.fromEntries(
        envFiles.flatMap((file) => {
            const fullPath = path.join(envDir, file);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile())
                return Object.entries(parse(fs.readFileSync(fullPath)))
            else return []
        }),
    )

    // only keys that start with prefix are exposed to client
    for (const [key, value] of Object.entries(parsed)) {
        process.env[key] = value
    }
}

// NOTE: will return true for staging.
export const isDev = () => !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging';

export const sleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};