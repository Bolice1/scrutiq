"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const axios_1 = __importDefault(require("axios"));
const email_service_1 = __importDefault(require("./services/email.service"));
// Load environment variables
dotenv_1.default.config();
// Initialize Database Connection
(0, db_1.default)();
const port = process.env.PORT || 5000;
const environment = process.env.NODE_ENV || "development";
// Hardened Cloud Keep-Alive: Standing Autonomous Heartbeat with Emergency Alerts
const initiateHeartbeat = () => {
    const selfUrl = environment === "development"
        ? `http://localhost:${port}/health`
        : `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`;
    let alertSent = false;
    const dispatch = async () => {
        try {
            console.log(`[System-Heartbeat] Probing: ${selfUrl}`);
            const response = await axios_1.default.get(selfUrl);
            console.log(`[System-Heartbeat] Status: ${response.data.status}`);
            // System recovered
            if (alertSent && response.data.status === "online") {
                await email_service_1.default.sendCustomEmail("ishyarugemachille4@gmail.com", "System Recovery Alert", `The Scrutiq Technical Portal (${environment}) has successfully recovered and is now online.\n\nProbe success at: ${new Date().toISOString()}`);
                alertSent = false;
            }
        }
        catch (error) {
            console.warn(`[System-Heartbeat] Probe Fault: ${error.message}`);
            if (!alertSent) {
                try {
                    console.log("[Emergency-Alert] Dispatching warning email to administrator...");
                    await email_service_1.default.sendCustomEmail("ishyarugemachille4@gmail.com", "System Outage Warning", `WARNING: The Scrutiq Technical Portal (${environment}) is currently unresponsive to internal health probes.\n\nError: ${error.message}\nTimestamp: ${new Date().toISOString()}\n\nPlease investigate the server logs for potential logic faults or infrastructure blocks.`);
                    alertSent = true;
                }
                catch (emailErr) {
                    console.error("[Emergency-Alert] Failed to dispatch warning email:", emailErr.message);
                }
            }
        }
    };
    // Immediate confirmation probe
    dispatch();
    // Permanent 2-minute interval
    setInterval(dispatch, 2 * 60 * 1000);
};
const server = app_1.default.listen(port, () => {
    console.log(`
  🚀 TECHNICAL PORTAL API INITIALIZED
  🚀 PORT: ${port}
  🚀 ENVIRONMENT: ${environment}
  🚀 CLOUD READINESS: OK
  `);
    initiateHeartbeat();
});
// System Termination Protocol
const shutdown = async (signal) => {
    console.log(`Cleanup Protocol Initiated (${signal}). Closing system resources...`);
    try {
        console.log("[Emergency-Alert] Dispatching shutdown notification...");
        await email_service_1.default.sendCustomEmail("ishyarugemachille4@gmail.com", "System Shutdown Alert", `The Scrutiq Technical Portal (${environment}) has received a ${signal} signal and is gracefully shutting down.\n\nTime: ${new Date().toISOString()}\n\nNote: If this was not a manual restart, please examine the deployment logs.`);
    }
    catch (err) {
        console.error("Shutdown notification failed:", err.message);
    }
    server.close(() => {
        console.log("System Process Finalized.");
        process.exit(0);
    });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Technical Rejection:", err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map