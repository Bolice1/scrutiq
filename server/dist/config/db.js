"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI || "", {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s
        });
        console.log(`[SYSTEM] MongoDB Connected: ${conn.connection.host}`);
        mongoose_1.default.connection.on('error', err => {
            console.error(`[SYSTEM FAULT] Runtime Database Error: ${err.message}`);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('[SYSTEM] Database Connection Lost. Retrying...');
        });
    }
    catch (error) {
        console.error(`[SYSTEM FAULT] Initial MongoDB Connection Failed: ${error.message}`);
        // Only exit on initial failure in production
        if (process.env.NODE_ENV === 'production')
            process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map