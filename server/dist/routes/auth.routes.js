"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const router = (0, express_1.Router)();
/**
 * USER ACCESS ROUTES
 * Simple endpoints for signing up and logging in.
 */
// Create a new account
router.post("/register", auth_controller_1.default.register);
// Login to existing account
router.post("/login", auth_controller_1.default.login);
// Email verification
router.post("/verify", auth_controller_1.default.verifyCode);
// Update Recruiter Profile
router.put("/profile/:id", auth_controller_1.default.updateProfile);
// Get Recruiter Profile
router.get("/profile/:id", auth_controller_1.default.getProfile);
// Get Recruiter Audit Logs
router.get("/profile/:id/logs", auth_controller_1.default.getAuditLogs);
// Delete Recruiter Profile
router.delete("/profile/:id", auth_controller_1.default.deleteProfile);
// Password Recovery Flow
router.post("/forgot-password", auth_controller_1.default.forgotPassword);
router.post("/verify-reset-pin", auth_controller_1.default.verifyResetPin);
router.post("/reset-password", auth_controller_1.default.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map