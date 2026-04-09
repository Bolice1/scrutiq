import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import projectsService from "./jobs.service";
import applicantsService from "./applicants.service";
import screeningService from "./screening.service";
import Job from "../models/Job.model";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CHAT_CONFIG = {
  systemInstruction: {
    role: "system",
    parts: [{ text: `
      You are the Scrutiq Technical AI Agent. You are the high-authority brain of this recruitment ecosystem.
      
      ADMINISTRATIVE POWERS:
      - ACCESS: You can fetch any profile, job, or system statistic.
      - ACTION: You can trigger screenings, adjust criteria, and DELETE records when requested.
      - CONTEXT: You always have a real-time pulse on the app's activity.
      
      TONE: High-authority, analytical, precise, and proactive.
      If a user asks for 'stats' or 'how many', use get_system_overview.
      If a user asks to 'remove' or 'delete', explain what you are doing before using the delete tools.
    `}]
  },
  tools: [{
    functionDeclarations: [
      { name: "list_jobs", description: "Get a list of all active jobs." },
      { name: "delete_job", description: "Permanently delete a job posting.", parameters: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] } },
      { name: "list_applicants", description: "Get a summary list of all applicants." },
      { name: "get_applicant_details", description: "Fetch the full technical profile and metadata of a specific applicant.", parameters: { type: "object", properties: { applicantId: { type: "string" } }, required: ["applicantId"] } },
      { name: "delete_applicant", description: "Permanently remove an applicant from the system.", parameters: { type: "object", properties: { applicantId: { type: "string" } }, required: ["applicantId"] } },
      { name: "get_rankings", description: "Get ranked list for a job.", parameters: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] } },
      { name: "trigger_screening", description: "Run AI assessment.", parameters: { type: "object", properties: { jobId: { type: "string" }, candidateIds: { type: "array", items: { type: "string" } } }, required: ["jobId", "candidateIds"] } },
      { name: "update_judging_bases", description: "Tighten/Loosen criteria.", parameters: { type: "object", properties: { jobId: { type: "string" }, instructions: { type: "string" } }, required: ["jobId", "instructions"] } },
      { name: "get_system_overview", description: "Fetch global aggregates: total applicants, jobs, and screening counts." },
    ],
  }],
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ]
};

export class ChatService {
  constructor() {}

  async handleMessage(message: string, history: any[], ownerId: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error("API Key Missing.");

    const formattedHistory = (history || [])
      .filter(h => h && h.role && h.content)
      .slice(-10) 
      .map(h => `${h.role === "user" ? "Recruiter" : "AI Assistant"}: ${h.content}`)
      .join("\n");

    const prompt = `
      CONTEXT HISTORY:
      ${formattedHistory}
      
      RECRUITER INPUT:
      ${message}
      
      TASK:
      Analyze and execute. You are connected to the central database.
    `;

    try {
      return await this.executeStatelessCycle(prompt, ownerId);
    } catch (error: any) {
      console.error("[CHAT AGENT FAULT]:", error.message);
      throw new Error(`Sync Error: ${error.message}`);
    }
  }

  private async executeStatelessCycle(prompt: string, ownerId: string, attempt: number = 1): Promise<any> {
    const models = ["gemini-flash-latest", "gemini-3.1-flash-lite-preview"];
    const activeModelName = attempt > 2 ? models[1] : models[0];
    
    const model = genAI.getGenerativeModel({ 
      model: activeModelName,
      tools: CHAT_CONFIG.tools,
      safetySettings: CHAT_CONFIG.safetySettings as any
    });

    try {
      const contents = [{ role: "user", parts: [{ text: prompt }] }];
      let result = await model.generateContent({ contents });
      let response = result.response;

      let iterations = 0;
      while (response.functionCalls()?.length > 0 && iterations < 3) {
        iterations++;
        const modelTurn = response.candidates![0].content;
        contents.push(modelTurn);

        const calls = response.functionCalls();
        const functionParts = [];

        for (const call of calls) {
          console.log(`[CHAT_EXEC] Op: ${call.name}`);
          let toolOutput: any;
          try {
            switch (call.name) {
              case "list_jobs": toolOutput = await projectsService.getAllJobs(ownerId); break;
              case "delete_job": toolOutput = await projectsService.deleteJob(call.args.jobId); break;
              case "list_applicants": toolOutput = await applicantsService.getAllApplicants(ownerId); break;
              case "get_applicant_details": toolOutput = await applicantsService.getApplicantById(call.args.applicantId); break;
              case "delete_applicant": toolOutput = await applicantsService.deleteApplicant(call.args.applicantId); break;
              case "get_rankings": toolOutput = await screeningService.getRankingsByJob(call.args.jobId); break;
              case "trigger_screening": toolOutput = await screeningService.executeScreening(call.args.jobId, call.args.candidateIds, ownerId); break;
              case "update_judging_bases":
                const job = await Job.findById(call.args.jobId);
                if (job) { job.screeningCriteria = call.args.instructions; await job.save(); toolOutput = { success: true }; }
                break;
              case "get_system_overview":
                const jCount = await Job.countDocuments(ownerId ? { ownerId } : {});
                const aCount = await applicantsService.getAllApplicants(ownerId);
                toolOutput = { jobs: jCount, applicants: aCount.length, detail: "Registry is healthy." };
                break;
            }
          } catch (te: any) { toolOutput = { error: te.message }; }

          functionParts.push({
            functionResponse: { name: call.name, response: { content: JSON.stringify(toolOutput) } },
          });
        }

        contents.push({ role: "user", parts: functionParts });
        const nextResult = await model.generateContent({ contents });
        response = nextResult.response;
      }

      return { role: "model", content: response.text() || "Action performed successfully." };

    } catch (error: any) {
      if (attempt < 3) return this.executeStatelessCycle(prompt, ownerId, attempt + 1);
      throw error;
    }
  }
}

export default new ChatService();
