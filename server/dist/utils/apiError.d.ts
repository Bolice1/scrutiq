export declare class ApiError extends Error {
    status: number;
    details?: any;
    constructor(status: number, message: string, details?: any);
}
