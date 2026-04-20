declare class AuditService {
    log(action: string, category: "AUTH" | "JOB" | "CANDIDATE" | "SCREENING" | "SYSTEM", details: string, ownerId: string): Promise<void>;
    getLogs(ownerId?: string): Promise<(import("mongoose").Document<unknown, {}, import("../models/AuditLog.model").IAuditLog, {}, import("mongoose").DefaultSchemaOptions> & import("../models/AuditLog.model").IAuditLog & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
}
declare const _default: AuditService;
export default _default;
