import { NextFunction, Request, Response } from "express";
export interface AuthRequest extends Request {
    user?: {
        sub: string;
        role: string;
    };
}
export declare const requireAuth: (roles?: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
