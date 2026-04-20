import { Request, Response } from "express";
declare class AuthController {
    /**
     * Technical Activation:
     * Verifies the email via a unique code.
     */
    verifyCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAuditLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    verifyResetPin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: AuthController;
export default _default;
