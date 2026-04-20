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
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const Applicant_model_1 = __importDefault(require("../models/Applicant.model"));
const Screening_model_1 = __importDefault(require("../models/Screening.model"));
let extractionQueue = Promise.resolve();
const queueExtraction = (task) => {
    const result = extractionQueue.then(task);
    extractionQueue = result.catch(() => { });
    return result;
};
class ApplicantsService {
    /**
     * Candidate Registry Retrieval:
     * Optimized with Batch Loading.
     */
    async getAllApplicants(ownerId) {
        if (!ownerId)
            return [];
        const applicants = await Applicant_model_1.default.find({ ownerId })
            .sort({ createdAt: -1 })
            .lean();
        const candidateIds = applicants.map(a => a._id.toString());
        // Efficiently batch load screenings to prevent N+1 queries
        const allScreenings = await Screening_model_1.default.find({
            candidateId: { $in: candidateIds }
        }).lean();
        const results = applicants.map((app) => {
            const candidateScreenings = allScreenings.filter(s => s.candidateId === app._id.toString());
            // Sort screenings by date to find the most recent evaluation
            const latestScreening = candidateScreenings.length > 0
                ? candidateScreenings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                : null;
            return {
                ...app,
                isScreened: !!latestScreening,
                screening: latestScreening || null,
            };
        });
        return results;
    }
    /**
     * Profile Detail Retrieval:
     */
    async getApplicantById(id) {
        return await Applicant_model_1.default.findById(id);
    }
    /**
     * Candidate Profile Initialization:
     */
    async addApplicant(applicantData, ownerId) {
        const newApp = new Applicant_model_1.default({
            ...applicantData,
            ownerId: ownerId || "global",
        });
        return await newApp.save();
    }
    async ingestFromFilesWithOwner(files, ownerId, providedEmails) {
        const emails = Array.isArray(providedEmails) ? providedEmails : [providedEmails].filter(Boolean);
        console.log(`[INGESTION] Multi-file request: ${files.length} dossiers received.`);
        // --- PHASE 1: SEQUENTIAL EXTRACTION & PERSISTENCE ---
        const preparedData = [];
        for (let i = 0; i < files.length; i++) {
            try {
                const data = await this.prepareFileData(files[i], ownerId, emails[i]);
                if (data)
                    preparedData.push(data);
            }
            catch (err) {
                console.error(`[INGESTION ERROR] Phase 1 failed for ${files[i].originalname}:`, err);
            }
        }
        if (preparedData.length === 0)
            return [];
        // --- PHASE 2: PARALLEL AI ENRICHMENT ---
        console.log(`[INGESTION] Phase 1 complete. Proceeding with Phase 2 for ${preparedData.length} records.`);
        const results = await Promise.all(preparedData.map(async (data) => {
            try {
                return await this.processTextViaAI(data.text, data.ownerId, data.source, data.email, data.resumeUrl);
            }
            catch (err) {
                console.error(`[INGESTION ERROR] Phase 2 AI failure for ${data.source}:`, err);
                return null;
            }
        }));
        const successfulResults = results.filter(Boolean);
        console.log(`[INGESTION SUCCESS] Ingested ${successfulResults.length} of ${files.length} requested files.`);
        return successfulResults;
    }
    async ingestFromUrls(urls, ownerId) {
        const axios = (await Promise.resolve().then(() => __importStar(require("axios")))).default;
        const preparedData = [];
        // --- PHASE 1: SEQUENTIAL URL FETCH & EXTRACTION ---
        for (const url of urls) {
            try {
                let targetUrl = url;
                let fileName = "external_doc";
                const docMatch = url.match(/\/d\/([\w_-]+)/);
                const docId = docMatch ? docMatch[1] : null;
                if (url.includes("docs.google.com/document") && docId) {
                    targetUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
                    fileName = `Doc-${docId}.pdf`;
                }
                else if (url.includes("drive.google.com/file") && docId) {
                    targetUrl = `https://docs.google.com/uc?id=${docId}&export=download`;
                    fileName = `Drive-${docId}.pdf`;
                }
                else {
                    fileName = url.split("/").pop()?.split(/[?#]/)[0] || "external_doc";
                    const allowedExts = ["pdf", "docx", "doc", "csv", "xlsx", "txt"];
                    const urlExt = fileName.split(".").pop()?.toLowerCase();
                    if (!urlExt || !allowedExts.includes(urlExt)) {
                        console.warn(`[SECURITY] URL Refusal: Insecure extension '${urlExt}' for ${url}`);
                        continue;
                    }
                }
                const response = await axios.get(targetUrl, {
                    responseType: "arraybuffer",
                    maxRedirects: 5,
                    timeout: 20000,
                    maxContentLength: 15 * 1024 * 1024,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    }
                });
                const contentType = (response.headers["content-type"] || "").toLowerCase();
                const allowedMimeTypes = [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/msword",
                    "text/csv",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "text/plain"
                ];
                // Security Lockdown: Refuse HTML or executable content from URLs
                const isSafeMime = allowedMimeTypes.some(m => contentType.includes(m));
                const isGoogleProxy = url.includes("google.com");
                if (!isSafeMime && !isGoogleProxy) {
                    console.error(`[SECURITY] URL Refusal: Untrusted content-type '${contentType}' for ${url}`);
                    continue;
                }
                const file = {
                    buffer: Buffer.from(response.data),
                    originalname: fileName,
                    mimetype: contentType,
                };
                if (contentType.includes("text/html") && !isGoogleProxy) {
                    console.warn(`[SECURITY] Blocking HTML ingestion from unverified source: ${url}`);
                    continue;
                }
                const res = await this.prepareFileData(file, ownerId);
                if (res)
                    preparedData.push(res);
            }
            catch (error) {
                console.error(`[URL INGESTION FAULT] ${url}:`, error.message);
            }
        }
        // --- PHASE 2: PARALLEL AI ENRICHMENT ---
        const results = await Promise.all(preparedData.map(async (data) => {
            try {
                return await this.processTextViaAI(data.text, data.ownerId, data.source, data.email, data.resumeUrl);
            }
            catch (err) {
                return null;
            }
        }));
        return results.filter(Boolean);
    }
    async prepareFileData(file, ownerId, email) {
        const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
        const path = await Promise.resolve().then(() => __importStar(require("path")));
        const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
        const originalName = file.originalname || "";
        const mime = (file.mimetype || "").toLowerCase();
        let ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() : "";
        const allowedExts = ["pdf", "docx", "doc", "csv", "xlsx", "txt"];
        // Explicitly force .pdf extension for PDF mime types or generic streams
        if (mime.includes("pdf") || ext === "0" || !ext) {
            ext = "pdf";
        }
        if (!allowedExts.includes(ext || "")) {
            console.warn(`[SECURITY] File Ingestion Refusal: Illegal extension Type '${ext}'`);
            return null;
        }
        // Create unique storage path
        const uploadDir = path.join(process.cwd(), "uploads", "resumes");
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        }
        catch (e) { }
        const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
        const fileName = `CV-${uniqueId}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        // Deep clone buffer to eliminate shared memory risks in pdf-parse
        const bufferClone = Buffer.from(file.buffer);
        await fs.writeFile(filePath, bufferClone);
        let text = "";
        try {
            if (ext === "pdf" || mime.includes("pdf")) {
                const data = await (0, pdf_parse_1.default)(bufferClone);
                text = data.text;
            }
            else if (ext === "docx" || ext === "doc" || mime.includes("word") || mime.includes("officedocument")) {
                const mammoth = await Promise.resolve().then(() => __importStar(require("mammoth")));
                const result = await mammoth.extractRawText({ buffer: bufferClone });
                text = result.value;
            }
            if (!text || text.trim().length < 50) {
                console.warn(`[INGESTION REFUSAL] ${file.originalname}: Insufficient text extracted.`);
                return null;
            }
            return {
                text,
                ownerId,
                source: file.originalname,
                email,
                resumeUrl: `resumes/${fileName}`
            };
        }
        catch (error) {
            console.error(`[EXTRACTION ERROR] ${file.originalname}:`, error.message);
            return null;
        }
    }
    async processTextViaAI(rawText, ownerId, source, fallbackEmail, resumeUrl) {
        const geminiService = (await Promise.resolve().then(() => __importStar(require("./gemini.service")))).default;
        const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
        const prompt = `
      Perform a deep extraction of candidate metadata from the following document.
      SESSION_ID: ${crypto.randomUUID()}
      SOURCE_REF: ${source}
      DOCUMENT_CONTENT: ${rawText.substring(0, 10000)}
      
      RESPOND ONLY WITH VALID JSON:
      {
        "name": "Full Name",
        "email": "Primary Email Address (EXTREMELY IMPORTANT: Search with all your might for links/icons, but NEVER guess. Return 'No email available' if not found.)",
        "gender": "Extract GENDER as 'M', 'F', or 'Not stated'. Search for pronouns/mentions, but NEVER guess based on names. If unsure, return 'Not stated'.",
        "role": "Most relevant title or current role",


        "location": "Current City/Country",
        "experience": "High-level summary of professional tenure",
        "technicalProfile": "Dense summary of technical stack and expertise"
      }
    `;
        try {
            const aiPromise = geminiService.executeWithRetry(prompt);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 90000));
            const result = await Promise.race([aiPromise, timeoutPromise]);
            const response = await result.response;
            const output = response.text();
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error("AI response did not contain valid metadata.");
            const data = JSON.parse(jsonMatch[0]);
            // --- ATOMIC PERSISTENCE QUEUE ---
            // We use a sequential queue for the duplicate check and save operation to prevent race conditions
            // during parallel ingestion (e.g., when multiple files for the same person are uploaded).
            return await queueExtraction(async () => {
                // Re-verify in DB now that we are in the sequential queue
                const email = (data.email || "").toLowerCase().trim();
                let isDuplicate = false;
                let originalId = null;
                let similarity = 0;
                if (email) {
                    const emailMatch = await Applicant_model_1.default.findOne({ ownerId, email });
                    if (emailMatch) {
                        isDuplicate = true;
                        originalId = emailMatch._id;
                        similarity = 100;
                    }
                }
                // Semantic Fallback if no email match
                if (!isDuplicate && data.name) {
                    const potentialMatches = await Applicant_model_1.default.find({
                        ownerId,
                        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') }
                    }).limit(3);
                    if (potentialMatches.length > 0) {
                        const comparisonPrompt = `
                Task: Compare two candidate resume summaries and determine if they represent the same person.
                Candidate A (New): ${data.technicalProfile}
                Candidate B (Existing): ${potentialMatches[0].technicalProfile}
                Respond only with JSON: { "isSamePerson": boolean, "similarity": number }
              `;
                        try {
                            const compResult = await geminiService.executeWithRetry(comparisonPrompt);
                            const compText = (await compResult.response).text();
                            const compData = JSON.parse(compText.match(/\{[\s\S]*\}/)?.[0] || '{"isSamePerson": false}');
                            if (compData.isSamePerson && compData.similarity > 85) {
                                isDuplicate = true;
                                originalId = potentialMatches[0]._id;
                                similarity = compData.similarity;
                            }
                        }
                        catch (e) { }
                    }
                }
                const applicant = new Applicant_model_1.default({
                    name: data.name || source.replace(/\.[^/.]+$/, ""),
                    email: email || fallbackEmail || `external-${crypto.randomUUID().substring(0, 8)}@registry.extern`,
                    role: data.role || "Technical Professional",
                    location: data.location || "Remote / Global",
                    experience: data.experience || "Verified Profile",
                    technicalProfile: data.technicalProfile || rawText.substring(0, 3000),
                    resumeText: rawText,
                    resumeUrl,
                    ownerId,
                    isDuplicate,
                    originalCandidateId: originalId,
                    similarityScore: similarity,
                    profileStatus: isDuplicate ? "Duplicate" : "Pending"
                });
                return await applicant.save();
            });
        }
        catch (e) {
            console.error("[AI DATA EXTRACTION FAULT]:", e);
            return null;
        }
    }
    async deleteApplicant(id) {
        const result = await Applicant_model_1.default.findByIdAndDelete(id);
        // --- REACTIVE AUDIT ---
        // If we just deleted a primary record, any profiles pointing to it as a duplicate
        // must be promoted to prevent infinite "Duplicate" stagnation.
        await Applicant_model_1.default.updateMany({ originalCandidateId: id }, {
            $set: {
                isDuplicate: false,
                profileStatus: "Verified",
                similarityScore: 0
            },
            $unset: { originalCandidateId: "" }
        });
        return result;
    }
    /**
     * Duplicate Resolution Protocol:
     * Discards one of the conflicting profiles after administrative confirmation.
     */
    async resolveDuplicate(id, action) {
        const duplicateProfile = await Applicant_model_1.default.findById(id);
        if (!duplicateProfile)
            throw new Error("Technical Registry Fault: Duplicate profile not found.");
        if (action === "keep_original") {
            // Preference: Discard the new duplicate and retain the primary record
            console.log(`[DUPLICATE RESOLUTION] Discarding new duplicate: ${id}`);
            return await Applicant_model_1.default.findByIdAndDelete(id);
        }
        else {
            // Preference: Replace the legacy record with the new ingestion
            const originalId = duplicateProfile.originalCandidateId;
            console.log(`[DUPLICATE RESOLUTION] Replacing legacy profile ${originalId} with new profile ${id}`);
            if (originalId) {
                await Applicant_model_1.default.findByIdAndDelete(originalId);
            }
            // Finalize the new profile as the primary entry
            duplicateProfile.isDuplicate = false;
            duplicateProfile.originalCandidateId = undefined;
            duplicateProfile.profileStatus = "Verified";
            return await duplicateProfile.save();
        }
    }
}
exports.default = new ApplicantsService();
//# sourceMappingURL=applicants.service.js.map