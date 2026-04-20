import { Request, Response } from "express";
declare class StatsController {
    /**
     * Technical System Stats Retrieval:
     * Returns real-time aggregates across jobs, applicants, and screenings.
     */
    getSystemStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: StatsController;
export default _default;
