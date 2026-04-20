import mongoose from "mongoose";
declare class ApplicantsService {
    /**
     * Candidate Registry Retrieval:
     * Optimized with Batch Loading.
     */
    getAllApplicants(ownerId?: string): Promise<any[]>;
    /**
     * Profile Detail Retrieval:
     */
    getApplicantById(id: string): Promise<(mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Candidate Profile Initialization:
     */
    addApplicant(applicantData: any, ownerId: string): Promise<mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    ingestFromFilesWithOwner(files: Express.Multer.File[], ownerId: string, providedEmails?: string | string[]): Promise<((mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null)[]>;
    ingestFromUrls(urls: string[], ownerId: string): Promise<((mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null)[]>;
    private prepareFileData;
    private processTextViaAI;
    deleteApplicant(id: string): Promise<(mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Duplicate Resolution Protocol:
     * Discards one of the conflicting profiles after administrative confirmation.
     */
    resolveDuplicate(id: string, action: "keep_original" | "keep_new"): Promise<(mongoose.Document<unknown, {}, import("../models/Applicant.model").IApplicant, {}, mongoose.DefaultSchemaOptions> & import("../models/Applicant.model").IApplicant & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
}
declare const _default: ApplicantsService;
export default _default;
