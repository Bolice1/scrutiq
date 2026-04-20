import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    companyName: string;
    isVerified: boolean;
    verificationCode?: string;
    resetCode?: string;
    resetCodeExpires?: Date;
    role: "admin" | "recruiter";
    profilePic?: string;
    notifications?: {
        candidateAlerts: boolean;
        screeningCompletions: boolean;
    };
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any, IUser>;
export default _default;
