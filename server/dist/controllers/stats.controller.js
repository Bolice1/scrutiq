"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Screening_model_1 = __importDefault(require("../models/Screening.model"));
const Job_model_1 = __importDefault(require("../models/Job.model"));
const Applicant_model_1 = __importDefault(require("../models/Applicant.model"));
class StatsController {
    /**
     * Technical System Stats Retrieval:
     * Returns real-time aggregates across jobs, applicants, and screenings.
     */
    async getSystemStats(req, res) {
        try {
            const ownerId = req.headers['x-owner-id'];
            const range = req.query.range || "weekly"; // weekly, monthly, annual
            // Determine applicable jobs for the owner
            const userJobsQuery = ownerId ? { ownerId } : {};
            const totalJobs = await Job_model_1.default.countDocuments(userJobsQuery);
            const totalApplicants = await Applicant_model_1.default.countDocuments(userJobsQuery);
            // We must isolate screenings to only jobs owned by this recruiter
            const userJobs = await Job_model_1.default.find(userJobsQuery).select('id _id title department');
            const jobIds = userJobs.map(j => (j.id || j._id).toString());
            const screeningQuery = jobIds.length > 0 ? { jobId: { $in: jobIds } } : { _id: null };
            const totalScreenings = await Screening_model_1.default.countDocuments(screeningQuery);
            // 2. Job Distribution
            const jobDist = await Job_model_1.default.aggregate([
                { $match: userJobsQuery },
                { $group: { _id: "$department", count: { $sum: 1 } } }
            ]);
            // 3. Screening Accuracy
            const avgScore = await Screening_model_1.default.aggregate([
                { $match: screeningQuery },
                { $group: { _id: null, avg: { $avg: "$matchScore" } } }
            ]);
            // 4. Activity Over Time (Dynamic Range)
            const sinceDate = new Date();
            let format = "%Y-%m-%d";
            if (range === "weekly") {
                sinceDate.setDate(sinceDate.getDate() - 7);
            }
            else if (range === "monthly") {
                sinceDate.setDate(sinceDate.getDate() - 30);
            }
            else if (range === "annual") {
                sinceDate.setMonth(sinceDate.getMonth() - 12);
                format = "%Y-%m"; // Group by month for annual view
            }
            const activity = await Screening_model_1.default.aggregate([
                { $match: { ...screeningQuery, updatedAt: { $gte: sinceDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format, date: "$updatedAt" } },
                        count: { $sum: 1 },
                        avgQuality: { $avg: "$matchScore" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            const stats = {
                assessments: totalScreenings,
                activeJobs: totalJobs,
                candidates: totalApplicants,
                matchSuccessRate: avgScore[0]?.avg || 0,
                jobDistribution: jobDist.map(d => ({ name: d._id || "Uncategorized", value: d.count })),
                detailedDistribution: userJobs.map((j) => ({
                    title: j.title || "Untitled Position",
                    department: j.department || "Uncategorized"
                })),
                performanceData: activity.map(a => ({
                    name: a._id,
                    screenings: a.count,
                    quality: Math.round(a.avgQuality)
                })),
                range: range,
            };
            return res.status(200).json({
                status: "success",
                data: stats,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return res.status(500).json({
                status: "fault",
                message: error.message
            });
        }
    }
}
exports.default = new StatsController();
//# sourceMappingURL=stats.controller.js.map