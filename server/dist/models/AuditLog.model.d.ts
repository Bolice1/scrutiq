import mongoose, { Document } from "mongoose";
export interface IAuditLog extends Document {
    action: string;
    category: "AUTH" | "JOB" | "CANDIDATE" | "SCREENING" | "SYSTEM";
    details: string;
    ownerId: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, mongoose.DefaultSchemaOptions> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAuditLog>;
export default _default;
