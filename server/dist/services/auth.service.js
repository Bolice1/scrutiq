"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = __importDefault(require("../models/User.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthService {
    async getAllUsers() {
        return await User_model_1.default.find({});
    }
    async findUserByEmail(email) {
        return await User_model_1.default.findOne({ email });
    }
    async findUserByCode(code) {
        return await User_model_1.default.findOne({ verificationCode: code });
    }
    async createUser(userData) {
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(userData.passwordHash, salt);
        // Generate a numeric 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = new User_model_1.default({
            id: `USR-${Math.floor(100 + Math.random() * 899)}`,
            fullName: userData.fullName,
            email: userData.email,
            passwordHash: passwordHash,
            companyName: userData.companyName,
            isVerified: false,
            verificationCode: verificationCode,
            role: "recruiter",
        });
        return await newUser.save();
    }
    async verifyPassword(raw, hash) {
        return await bcryptjs_1.default.compare(raw, hash);
    }
    async generateResetPin(user) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = pin;
        user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();
        return pin;
    }
    async updatePassword(user, newPassword) {
        const salt = await bcryptjs_1.default.genSalt(10);
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        return await user.save();
    }
}
exports.default = new AuthService();
//# sourceMappingURL=auth.service.js.map