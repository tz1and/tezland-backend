import { Request, Response } from 'express'

export const defaultRoute = async (req: Request, res: Response) => {
    res.send( "Nothing here!" );
}