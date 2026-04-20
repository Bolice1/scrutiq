"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AuditLog_model_1 = __importDefault(require("../models/AuditLog.model"));
class AuditService {
    async log(action, category, details, ownerId) {
        try {
            await AuditLog_model_1.default.create({
                action,
                category,
                details,
                ownerId: ownerId || "global"
            });
            console.log(`[AUDIT] ${action} logged for ${ownerId}`);
        }
        catch (error) {
            console.error("[AUDIT FAULT] Failed to save log:", error);
        }
    }
    async getLogs(ownerId) {
        return AuditLog_model_1.default.find(ownerId ? { ownerId } : {}).sort({ createdAt: -1 }).limit(50);
    }
}
exports.default = new AuditService();
//# sourceMappingURL=audit.service.js.map