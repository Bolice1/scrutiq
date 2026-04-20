import mongoose, { Document } from "mongoose";
export interface IScreening extends Document {
    jobId: string;
    candidateId: string;
    candidateName?: string;
    candidateEmail?: string;
    candidateGender?: "M" | "F" | "Not stated";
    matchScore: number;
    strengths: string[];
    weaknesses: string[];
    finalRecommendation: "Priority Alignment" | "Technical Fit" | "Potential Fit" | "No Alignment";
    reasoning: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IScreening, {}, {}, {}, mongoose.Document<unknown, {}, IScreening, {}, mongoose.DefaultSchemaOptions> & IScreening & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IScreening>;
export default _default;
