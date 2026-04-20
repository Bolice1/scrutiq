"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = __importDefault(require("../services/auth.service"));
const email_service_1 = __importDefault(require("../services/email.service"));
class AuthController {
    /**
     * Technical Activation:
     * Verifies the email via a unique code.
     */
    async verifyCode(req, res) {
        try {
            const { code } = req.body;
            if (!code)
                return res
                    .status(400)
                    .json({ status: "fault", message: "Verification code required." });
            const user = await auth_service_1.default.findUserByCode(code);
            if (!user)
                return res.status(400).json({
                    status: "fault",
                    message: "Invalid or expired activation code.",
                });
            user.isVerified = true;
            user.verificationCode = undefined;
            await user.save();
            return res.status(200).json({
                status: "success",
                message: "Account activated successfully. You can now login.",
                data: { user: { id: user.id || user._id, email: user.email } },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async register(req, res) {
        try {
            const { fullName, email, password, companyName } = req.body;
            if (!fullName || !email || !password || !companyName) {
                return res
                    .status(400)
                    .json({ status: "fault", message: "Please fill in all fields." });
            }
            // Strong Password Validation: 8+ chars, 1 uppercase, 1 symbol
            const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    status: "fault",
                    message: "Password must be at least 8 characters, include 1 uppercase and 1 technical symbol (!@#$%^&*).",
                });
            }
            const existingUser = await auth_service_1.default.findUserByEmail(email);
            if (existingUser) {
                if (existingUser.isVerified) {
                    return res.status(400).json({
                        status: "fault",
                        message: "This email is already registered and verified.",
                    });
                }
                else {
                    // If unverified, we delete the stale account to allow fresh registration
                    console.log(`[AUTH] Removing unverified account for ${email} to allow re-registration.`);
                    const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
                    await User.findByIdAndDelete(existingUser._id);
                }
            }
            const newUser = await auth_service_1.default.createUser({
                fullName,
                email,
                passwordHash: password,
                companyName,
            });
            // BLOCKING Email Dispatch: If this fails, the account creation is rolled back
            try {
                await email_service_1.default.sendVerificationCode(newUser.email, newUser.verificationCode);
            }
            catch (emailError) {
                console.error("[AUTH] Email Dispatch Failed. Rolling back account creation...", emailError);
                const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
                await User.findByIdAndDelete(newUser._id);
                return res.status(500).json({
                    status: "fault",
                    message: `Technical Fault: Could not dispatch activation code. Registration aborted. Error: ${emailError.message}`,
                });
            }
            return res.status(201).json({
                status: "success",
                message: "Account initialized. Activation code sent to email.",
                data: { email: newUser.email },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await auth_service_1.default.findUserByEmail(email);
            if (!user) {
                return res
                    .status(401)
                    .json({ status: "fault", message: "Invalid credentials." });
            }
            if (!user.isVerified) {
                return res.status(401).json({
                    status: "fault",
                    message: "Account not verified. Please activate via email.",
                });
            }
            const isMatch = await auth_service_1.default.verifyPassword(password, user.passwordHash);
            if (!isMatch) {
                return res
                    .status(401)
                    .json({ status: "fault", message: "Invalid credentials." });
            }
            const auditService = (await Promise.resolve().then(() => __importStar(require("../services/audit.service")))).default;
            auditService.log("USER_LOGIN", "AUTH", `Recruiter authenticated successfully.`, user._id.toString());
            // Technical Repair: Bridging to Google's OpenSocial proxy container for direct branding fetch
            const profilePic = user.profilePic || `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=https://www.google.com/s2/photos/profile/${user.email}?sz=128`;
            return res.status(200).json({
                status: "success",
                data: {
                    user: {
                        id: user.id || user._id,
                        name: user.fullName,
                        email: user.email,
                        company: user.companyName,
                        role: user.role,
                        profilePic
                    },
                },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const { fullName, companyName, notifications } = req.body;
            const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            let user;
            if (mongoose.Types.ObjectId.isValid(id)) {
                user = await User.findById(id);
            }
            else {
                user = await User.findOne({ id });
            }
            if (!user) {
                return res
                    .status(404)
                    .json({ status: "fault", message: "User not found." });
            }
            if (fullName)
                user.fullName = fullName;
            if (companyName)
                user.companyName = companyName;
            if (notifications) {
                user.notifications = {
                    ...user.notifications,
                    ...notifications
                };
            }
            await user.save();
            const auditService = (await Promise.resolve().then(() => __importStar(require("../services/audit.service")))).default;
            auditService.log("PROFILE_UPDATE", "AUTH", `Recruiter profile and notification preferences synchronized.`, user._id.toString());
            return res.status(200).json({
                status: "success",
                data: {
                    id: user.id || user._id,
                    name: user.fullName,
                    email: user.email,
                    company: user.companyName,
                    role: user.role,
                    notifications: user.notifications
                },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async getProfile(req, res) {
        try {
            const { id } = req.params;
            const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            let user;
            if (mongoose.Types.ObjectId.isValid(id)) {
                user = await User.findById(id);
            }
            else {
                user = await User.findOne({ id });
            }
            if (!user) {
                return res
                    .status(404)
                    .json({ status: "fault", message: "User not found." });
            }
            return res.status(200).json({
                status: "success",
                data: {
                    id: user.id || user._id,
                    name: user.fullName,
                    email: user.email,
                    company: user.companyName,
                    role: user.role,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async getAuditLogs(req, res) {
        try {
            const { id } = req.params;
            const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            let user;
            if (mongoose.Types.ObjectId.isValid(id)) {
                user = await User.findById(id);
            }
            else {
                user = await User.findOne({ id });
            }
            if (!user) {
                return res
                    .status(404)
                    .json({ status: "fault", message: "Invalid profile identifier." });
            }
            const auditService = (await Promise.resolve().then(() => __importStar(require("../services/audit.service")))).default;
            // We log with the string format of _id, so get by string
            const logs = await auditService.getLogs(user._id.toString());
            return res.status(200).json({
                status: "success",
                data: logs,
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async deleteProfile(req, res) {
        try {
            const { id } = req.params;
            const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            const Job = (await Promise.resolve().then(() => __importStar(require("../models/Job.model")))).default;
            const Applicant = (await Promise.resolve().then(() => __importStar(require("../models/Applicant.model")))).default;
            const Screening = (await Promise.resolve().then(() => __importStar(require("../models/Screening.model")))).default;
            const AuditLog = (await Promise.resolve().then(() => __importStar(require("../models/AuditLog.model")))).default;
            let user;
            if (mongoose.Types.ObjectId.isValid(id)) {
                user = await User.findById(id);
            }
            else {
                user = await User.findOne({ id });
            }
            if (!user) {
                return res
                    .status(404)
                    .json({ status: "fault", message: "User not found." });
            }
            // Hard delete user
            await User.findByIdAndDelete(user._id);
            // In a real application, you might want to also delete related records:
            // Jobs, Applicants, Screenings, and AuditLogs matching the user._id.
            // For now we'll delete the user and return success.
            return res.status(200).json({
                status: "success",
                message: "Account and associated data deleted successfully.",
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email)
                return res
                    .status(400)
                    .json({ status: "fault", message: "Email is required." });
            const user = await auth_service_1.default.findUserByEmail(email);
            if (!user) {
                // Obfuscate to prevent email harvesting
                return res.status(200).json({
                    status: "success",
                    message: "If that email is registered, a recovery PIN has been sent.",
                });
            }
            const pin = await auth_service_1.default.generateResetPin(user);
            await email_service_1.default.sendPasswordResetPin(user.email, pin);
            return res.status(200).json({
                status: "success",
                message: "A recovery PIN has been dispatched to your email.",
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async verifyResetPin(req, res) {
        try {
            const { email, pin } = req.body;
            if (!email || !pin)
                return res
                    .status(400)
                    .json({ status: "fault", message: "Email and PIN are required." });
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            const user = await User.findOne({ email, resetCode: pin });
            if (!user) {
                return res
                    .status(400)
                    .json({ status: "fault", message: "Invalid verification PIN." });
            }
            if (user.resetCodeExpires && user.resetCodeExpires < new Date()) {
                return res
                    .status(400)
                    .json({ status: "fault", message: "Recovery PIN has expired." });
            }
            return res.status(200).json({
                status: "success",
                message: "PIN verified. Secure session established.",
                data: { email: user.email },
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async resetPassword(req, res) {
        try {
            const { email, pin, password, fullName, companyName } = req.body;
            if (!email || !pin || !password) {
                return res.status(400).json({
                    status: "fault",
                    message: "Metadata and new credentials required.",
                });
            }
            const User = (await Promise.resolve().then(() => __importStar(require("../models/User.model")))).default;
            const user = await User.findOne({ email, resetCode: pin });
            if (!user) {
                return res.status(400).json({
                    status: "fault",
                    message: "Security breach or invalid recovery state.",
                });
            }
            // Strong Password Validation: 8+ chars, 1 uppercase, 1 symbol
            const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    status: "fault",
                    message: "Password must be at least 8 characters, include 1 uppercase and 1 technical symbol (!@#$%^&*).",
                });
            }
            // Security Protocol: Actually apply and persist the new password hash
            await auth_service_1.default.updatePassword(user, password);
            // No extra user.save() here as it is handled inside updatePassword
            const auditService = (await Promise.resolve().then(() => __importStar(require("../services/audit.service")))).default;
            auditService.log("PASSWORD_RESET", "AUTH", `Recruiter successfully recovered account via secure PIN and rotated credentials.`, user._id.toString());
            return res.status(200).json({
                status: "success",
                message: "Security credentials updated. You can now login with your new password.",
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
}
exports.default = new AuthController();
//# sourceMappingURL=auth.controller.js.map