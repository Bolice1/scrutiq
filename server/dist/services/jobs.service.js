"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Job_model_1 = __importDefault(require("../models/Job.model"));
const Screening_model_1 = __importDefault(require("../models/Screening.model"));
class JobsService {
    /**
     * Job Registry Retrieval:
     * Returns all active job postings for a specific owner.
     */
    async getAllJobs(ownerId) {
        if (!ownerId)
            return [];
        const jobs = await Job_model_1.default.find({ ownerId }).sort({ createdAt: -1 }).lean();
        // Add dynamic count from screenings
        const results = await Promise.all(jobs.map(async (job) => {
            const count = await Screening_model_1.default.countDocuments({
                jobId: job._id.toString(),
            });
            return { ...job, applicantsCount: count };
        }));
        return results;
    }
    /**
     * Detail Matrix Retrieval:
     * Returns a specific job metric by ID.
     */
    async getJobById(id) {
        const job = await Job_model_1.default.findById(id).lean();
        if (!job)
            return null;
        const count = await Screening_model_1.default.countDocuments({ jobId: job._id.toString() });
        return { ...job, applicantsCount: count };
    }
    /**
     * Job Requirement Initialization:
     * Adds a new technical requirement to the database.
     */
    async createJob(jobData) {
        // Normalization logic to catch semantically identical titles (e.g., plurals)
        const normalizeTitle = (title) => {
            return title
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ') // Collapse multiple spaces
                .replace(/s$/, '') // Remove simple plural 's'
                .replace(/es$/, ''); // Remove 'es' plural
        };
        const targetNormalized = normalizeTitle(jobData.title);
        // Fetch user's existing jobs to compare
        const existingJobs = await Job_model_1.default.find({ ownerId: jobData.ownerId }).select('title');
        const semanticDuplicate = existingJobs.find(job => normalizeTitle(job.title) === targetNormalized);
        if (semanticDuplicate) {
            throw new Error(`ALREADY_EXISTS: This job already exists in the app.`);
        }
        const newJob = new Job_model_1.default({
            ...jobData,
            applicantsCount: 0,
            status: "Active",
        });
        return await newJob.save();
    }
    /**
     * Update Judgement Criteria:
     * Modifies an existing technical requirement.
     */
    async updateJob(id, updatedData) {
        // Normalization logic
        const normalizeTitle = (title) => {
            return title
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/s$/, '')
                .replace(/es$/, '');
        };
        if (updatedData.title) {
            const currentJob = await Job_model_1.default.findById(id);
            if (!currentJob)
                return null;
            const targetNormalized = normalizeTitle(updatedData.title);
            // Look for duplicates excluding the current job
            const existingJobs = await Job_model_1.default.find({
                ownerId: currentJob.ownerId,
                _id: { $ne: id }
            }).select('title');
            const semanticDuplicate = existingJobs.find(job => normalizeTitle(job.title) === targetNormalized);
            if (semanticDuplicate) {
                throw new Error(`ALREADY_EXISTS: This job already exists in the app.`);
            }
        }
        return await Job_model_1.default.findByIdAndUpdate(id, updatedData, { new: true });
    }
    async deleteJob(id) {
        return await Job_model_1.default.findByIdAndDelete(id);
    }
}
exports.default = new JobsService();
//# sourceMappingURL=jobs.service.js.map