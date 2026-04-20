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
const mongoose_1 = __importDefault(require("mongoose"));
const applicants_service_1 = __importDefault(require("../services/applicants.service"));
const User_model_1 = __importDefault(require("../models/User.model"));
class ApplicantsController {
    /**
     * Candidate Registry Retrieval:
     * Returns all profiles currently stored in the candidate registry.
     */
    async getAll(req, res) {
        try {
            const ownerId = req.headers["x-owner-id"];
            const applicants = await applicants_service_1.default.getAllApplicants(ownerId);
            return res.status(200).json({ status: "success", data: applicants });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    /**
     * Talent Profile Ingestion:
     * Handles administrative PDF/CSV uploads to the registry.
     */
    async upload(req, res) {
        try {
            const files = req.files;
            const urls = req.body.urls ? (Array.isArray(req.body.urls) ? req.body.urls : [req.body.urls]) : [];
            const ownerId = req.headers["x-owner-id"] || "global";
            const emails = req.body.emails;
            if ((!files || files.length === 0) && urls.length === 0) {
                return res.status(400).json({
                    status: "fault",
                    message: "No documents or links provided for ingestion.",
                });
            }
            console.log(`[TECHNICAL INGESTION] Multi-source ingestion started. Files: ${files?.length || 0}, Links: ${urls.length}`);
            // Execute both ingestion protocols in parallel for maximum performance
            const [fileResults, urlResults] = await Promise.all([
                files && files.length > 0 ? applicants_service_1.default.ingestFromFilesWithOwner(files, ownerId, emails) : Promise.resolve([]),
                urls.length > 0 ? applicants_service_1.default.ingestFromUrls(urls, ownerId) : Promise.resolve([])
            ]);
            const totalResults = [...fileResults, ...urlResults];
            const duplicateCount = totalResults.filter(r => r && r.isDuplicate).length;
            const newCount = totalResults.length - duplicateCount;
            return res.status(201).json({
                status: "success",
                message: `${newCount} new profiles ingested, ${duplicateCount} potential duplicates flagged.`,
                protocol: "HYBRID_INGESTION_v2",
                data: {
                    total: totalResults.length,
                    newCount,
                    duplicateCount,
                    results: totalResults
                },
            });
        }
        catch (error) {
            console.error("[INGESTION FAULT] System failure during hybrid ingestion:", error);
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    /**
     * Candidate Profile Initialization:
     * Adds a new technical profile to the candidate registry.
     */
    async create(req, res) {
        try {
            const ownerId = req.headers["x-owner-id"] || "global";
            const applicant = await applicants_service_1.default.addApplicant(req.body, ownerId);
            return res.status(201).json({ status: "success", data: applicant });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    /**
     * Profile Detail Retrieval:
     * Returns a specific candidate profile by ID.
     */
    async getById(req, res) {
        try {
            const applicant = await applicants_service_1.default.getApplicantById(req.params.id);
            if (!applicant)
                return res
                    .status(404)
                    .json({ status: "fault", message: "Candidate Profile Not Found." });
            return res.status(200).json({ status: "success", data: applicant });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async delete(req, res) {
        try {
            const applicant = await applicants_service_1.default.deleteApplicant(req.params.id);
            if (!applicant)
                return res
                    .status(404)
                    .json({ status: "fault", message: "Candidate Profile Not Found." });
            return res
                .status(200)
                .json({ status: "success", message: "Candidate Profile Deleted." });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async sendEmail(req, res) {
        try {
            const { id } = req.params;
            const { subject, message, recipientEmail } = req.body;
            const applicant = await applicants_service_1.default.getApplicantById(id);
            if (!applicant) {
                return res.status(404).json({ status: "fault", message: "Applicant not found." });
            }
            const emailService = (await Promise.resolve().then(() => __importStar(require("../services/email.service")))).default;
            const targetEmail = recipientEmail || applicant.email;
            // Extract recruiter context from headers
            const ownerId = req.headers["x-owner-id"];
            let recruiterEmail = undefined;
            if (ownerId && ownerId !== "global") {
                // Robust lookup for both ObjectId and legacy ID field
                const query = mongoose_1.default.isValidObjectId(ownerId)
                    ? { _id: ownerId }
                    : { id: ownerId };
                const recruiter = await User_model_1.default.findOne(query).lean();
                if (recruiter)
                    recruiterEmail = recruiter.email;
            }
            await emailService.sendCustomEmail(targetEmail, subject, message, recruiterEmail);
            return res.status(200).json({ status: "success", message: "Email dispatched successfully." });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
    async handleResolveDuplicate(req, res) {
        try {
            const { id } = req.params;
            const { action } = req.body; // "keep_original" or "keep_new"
            const result = await applicants_service_1.default.resolveDuplicate(id, action);
            return res.status(200).json({
                status: "success",
                message: action === "keep_original" ? "Duplicate discarded." : "Profile updated with new version.",
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({ status: "fault", message: error.message });
        }
    }
}
exports.default = new ApplicantsController();
//# sourceMappingURL=applicants.controller.js.map