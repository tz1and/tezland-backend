import { Request, Response } from 'express'

export const defaultRoute = async (req: Request, res: Response) => {
    res.send( "There's nothing here! &star;&profline;&lpar;&gt;&#x3002;&lt;&rpar;" );
}