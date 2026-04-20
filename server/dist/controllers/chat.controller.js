"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_service_1 = __importDefault(require("../services/chat.service"));
class ChatController {
    async sendMessage(req, res) {
        try {
            const { message, history } = req.body;
            const ownerId = req.headers["x-owner-id"] || "global";
            if (!message) {
                return res.status(400).json({ status: "fault", message: "Message is required." });
            }
            const response = await chat_service_1.default.handleMessage(message, history || [], ownerId);
            return res.status(200).json({
                status: "success",
                data: response,
            });
        }
        catch (error) {
            console.error("[CHAT CONTROLLER FAULT]:", error);
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
}
exports.default = new ChatController();
//# sourceMappingURL=chat.controller.js.map