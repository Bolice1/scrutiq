"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../config/auth");
const apiError_1 = require("../utils/apiError");
const http_status_codes_1 = require("http-status-codes");
const requireAuth = (roles) => {
    return (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            return next(new apiError_1.ApiError(http_status_codes_1.StatusCodes.UNAUTHORIZED, "Missing token"));
        }
        const token = header.split(" ")[1];
        try {
            const payload = jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwtSecret);
            if (roles && !roles.includes(payload.role)) {
                return next(new apiError_1.ApiError(http_status_codes_1.StatusCodes.FORBIDDEN, "Forbidden"));
            }
            req.user = payload;
            return next();
        }
        catch (err) {
            return next(new apiError_1.ApiError(http_status_codes_1.StatusCodes.UNAUTHORIZED, "Invalid token", err));
        }
    };
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map