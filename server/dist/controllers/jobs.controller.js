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
const jobs_service_1 = __importDefault(require("../services/jobs.service"));
class JobsController {
    /**
     * Technical Requirement Registry Retrieval:
     * Returns all active job postings in the recruiter registry.
     */
    async getAll(req, res) {
        try {
            const ownerId = req.headers["x-owner-id"];
            const jobs = await jobs_service_1.default.getAllJobs(ownerId);
            return res.status(200).json({ status: "success", data: jobs });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    /**
     * Job Requirement Initialization:
     * Adds a new technical requirement to the registry.
     */
    async create(req, res) {
        try {
            const ownerId = req.headers["x-owner-id"] || "global";
            const newJob = await jobs_service_1.default.createJob({ ...req.body, ownerId });
            const auditService = (await Promise.resolve().then(() => __importStar(require("../services/audit.service")))).default;
            auditService.log("JOB_CREATE", "JOB", `New technical requirement initialized: ${newJob.title}`, ownerId);
            return res.status(201).json({
                status: "success",
                data: newJob,
            });
        }
        catch (error) {
            console.error("Job Creation Fault:", error);
            const isDuplicate = error.message?.includes("ALREADY_EXISTS");
            return res
                .status(isDuplicate ? 400 : 500)
                .json({
                status: "fault",
                message: isDuplicate
                    ? error.message.replace("ALREADY_EXISTS: ", "")
                    : "Failed to create technical requirement registry entry."
            });
        }
    }
    async updateJob(req, res) {
        try {
            const { id } = req.params;
            const updatedJob = await jobs_service_1.default.updateJob(id, req.body);
            if (!updatedJob) {
                return res
                    .status(404)
                    .json({ status: "fault", message: "Job Requirement not found." });
            }
            return res.status(200).json({
                status: "success",
                data: updatedJob,
            });
        }
        catch (error) {
            console.error("Job Update Fault:", error);
            const isDuplicate = error.message?.includes("ALREADY_EXISTS");
            return res
                .status(isDuplicate ? 400 : 500)
                .json({
                status: "fault",
                message: isDuplicate
                    ? error.message.replace("ALREADY_EXISTS: ", "")
                    : "Failed to update technical requirement.",
            });
        }
    }
    /**
     * Detail Matrix Retrieval:
     * Returns a specific job metric by ID.
     */
    async getById(req, res) {
        try {
            const job = await jobs_service_1.default.getJobById(req.params.id);
            if (!job)
                return res
                    .status(404)
                    .json({ status: "fault", message: "Job Requirement Not Found." });
            return res.status(200).json({ status: "success", data: job });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await jobs_service_1.default.deleteJob(id);
            if (!deleted)
                return res
                    .status(404)
                    .json({ status: "fault", message: "Job Requirement Not Found." });
            return res
                .status(200)
                .json({
                status: "success",
                message: "Job Requirement deleted successfully.",
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
}
exports.default = new JobsController();
//# sourceMappingURL=jobs.controller.js.map