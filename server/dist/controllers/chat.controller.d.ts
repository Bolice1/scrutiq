import { Request, Response } from "express";
declare class ChatController {
    sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: ChatController;
export default _default;
