import { z } from "zod";
export declare const signupSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<["admin", "recruiter"]>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
        role?: "admin" | "recruiter" | undefined;
    }, {
        email: string;
        password: string;
        role?: "admin" | "recruiter" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
        role?: "admin" | "recruiter" | undefined;
    };
}, {
    body: {
        email: string;
        password: string;
        role?: "admin" | "recruiter" | undefined;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
