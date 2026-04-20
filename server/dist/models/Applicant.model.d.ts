import mongoose, { Document } from "mongoose";
export interface IApplicant extends Document {
    id: string;
    name: string;
    role: string;
    location: string;
    experience: string;
    email: string;
    gender: "M" | "F" | "Not stated";
    technicalProfile: string;
    resumeText?: string;
    resumeUrl?: string;
    profileStatus: "Verified" | "Pending" | "Archived" | "Duplicate";
    isDuplicate: boolean;
    originalCandidateId?: string;
    similarityScore?: number;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IApplicant, {}, {}, {}, mongoose.Document<unknown, {}, IApplicant, {}, mongoose.DefaultSchemaOptions> & IApplicant & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any, IApplicant>;
export default _default;
