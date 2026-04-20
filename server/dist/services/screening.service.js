"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Screening_model_1 = __importDefault(require("../models/Screening.model"));
const Applicant_model_1 = __importDefault(require("../models/Applicant.model"));
const gemini_service_1 = __importDefault(require("./gemini.service"));
const jobs_service_1 = __importDefault(require("./jobs.service"));
const applicants_service_1 = __importDefault(require("./applicants.service"));
class ScreeningService {
    async getRankingsByJob(jobId) {
        const rankings = await Screening_model_1.default.find({ jobId })
            .sort({ matchScore: -1 })
            .lean();
        // Enrich with applicant data (email, real name if missing)
        const enriched = await Promise.all(rankings.map(async (rank) => {
            // Improved lookup: Check both _id and legacy id field
            const query = {};
            if (mongoose_1.default.isValidObjectId(rank.candidateId)) {
                query._id = rank.candidateId;
            }
            else {
                query.$or = [{ id: rank.candidateId }, { email: rank.candidateEmail }];
            }
            const applicant = (await Applicant_model_1.default.findOne(query).lean());
            return {
                ...rank,
                id: rank.candidateId, // Surface for frontend lookup
                candidateName: applicant?.name || rank.candidateName || "Technical Candidate",
                candidateEmail: applicant?.email || "No email available",
                candidateGender: applicant?.gender || rank.candidateGender || "Not stated",
                candidateExperience: applicant?.experience || "No experience provided",
                candidateResume: applicant?.resumeUrl || null,
                resumeText: applicant?.resumeText || null,
                isDuplicate: applicant?.isDuplicate || false,
            };
        }));
        return enriched;
    }
    /**
     * Technical Screening Protocol:
     * Orchestrates the candidate ranking process using the Gemini AI service.
     */
    async executeScreening(jobId, candidateIds, ownerId) {
        // 1. Requirement Matrix Retrieval
        const job = await jobs_service_1.default.getJobById(jobId);
        if (!job)
            throw new Error("Job Requirement Registry Fault: Job not found.");
        if (job.status === "Archived") {
            throw new Error("Job Requirement Registry Fault: Cannot perform screening against an archived job.");
        }
        // 2. Candidate Registry Retrieval
        // We need to get ONLY applicants for this owner to ensure isolation
        const allApplicants = await applicants_service_1.default.getAllApplicants(ownerId);
        const targetCandidates = allApplicants.filter((app) => candidateIds.includes(app._id?.toString() || app.id));
        if (targetCandidates.length === 0) {
            throw new Error(`Candidate Registry Fault: No eligible profiles for screening.`);
        }
        // 3. AI Execution Protocol
        console.log(`Executing AI Alignment Protocol for Job ${jobId} against ${targetCandidates.length} candidates...`);
        const results = await gemini_service_1.default.screenCandidates(job, targetCandidates);
        // 4. Result Finalization & Persistence
        const savedResults = [];
        for (const result of results) {
            const candidateId = result.candidateId;
            // Update the Applicant record with AI-extracted data for better registry quality
            if (result.candidateEmail ||
                result.candidateName ||
                result.microSummary) {
                await mongoose_1.default.model("Applicant").findByIdAndUpdate(candidateId, {
                    name: result.candidateName,
                    email: result.candidateEmail,
                    gender: result.candidateGender || "Not stated",
                    experience: result.microSummary,
                });
            }
            // Upsert the results based on jobId and candidateId
            const screeningResult = await Screening_model_1.default.findOneAndUpdate({ jobId, candidateId }, {
                ...result,
                jobId,
                candidateName: result.candidateName || "Unknown Candidate",
            }, { upsert: true, new: true });
            savedResults.push(screeningResult);
        }
        // 5. Enrichment Protocol for Frontend Delivery
        const enrichedResults = await Promise.all(savedResults.map(async (res) => {
            const applicant = await Applicant_model_1.default.findById(res.candidateId).lean();
            return {
                ...res.toObject(),
                candidateGender: applicant?.gender || res.candidateGender || "Not stated",
                candidateExperience: applicant?.experience || "No experience provided",
                candidateResume: applicant?.resumeUrl || null,
            };
        }));
        return enrichedResults;
    }
    async deleteScreening(id) {
        return await Screening_model_1.default.findByIdAndDelete(id);
    }
}
exports.default = new ScreeningService();
//# sourceMappingURL=screening.service.js.map