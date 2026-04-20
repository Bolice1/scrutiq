declare class GeminiService {
    private genAI;
    private model;
    constructor();
    executeWithRetry(prompt: string, attempt?: number): Promise<any>;
    /**
     * Technical Screening Protocol:
     * Analyzes candidate registry against job requirement matrix.
     */
    screenCandidates(jobData: any, candidates: any[]): Promise<any>;
}
declare const _default: GeminiService;
export default _default;
