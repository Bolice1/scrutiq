"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.name = this.constructor.name;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=apiError.js.map