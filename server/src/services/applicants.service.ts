import mongoose from "mongoose";
import pdf from "pdf-parse";
import Applicant from "../models/Applicant.model";
import Screening from "../models/Screening.model";

class ApplicantsService {
  /**
   * Candidate Registry Retrieval:
   * Optimized with Batch Loading.
   */
  async getAllApplicants(ownerId?: string) {
    if (!ownerId) return [];

    const applicants = await Applicant.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean();

    const candidateIds = applicants.map(a => a._id.toString());
    
    // Efficiently batch load screenings to prevent N+1 queries
    const allScreenings = await Screening.find({
      candidateId: { $in: candidateIds }
    }).lean();

    const results = applicants.map((app: any) => {
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
  async getApplicantById(id: string) {
    return await Applicant.findById(id);
  }

  /**
   * Candidate Profile Initialization:
   */
  async addApplicant(applicantData: any, ownerId: string) {
    const newApp = new Applicant({
      ...applicantData,
      ownerId: ownerId || "global",
    });
    return await newApp.save();
  }

  async ingestFromFilesWithOwner(
    files: Express.Multer.File[],
    ownerId: string,
    providedEmails?: string | string[],
  ) {
    const emails = Array.isArray(providedEmails) ? providedEmails : [providedEmails].filter(Boolean);

    // Process all files in parallel with error isolation
    const results = await Promise.all(
      files.map((file, i) => this.processFile(file, ownerId, emails[i]))
    );

    return results.filter(Boolean);
  }

  async ingestFromUrls(urls: string[], ownerId: string) {
    const axios = (await import("axios")).default;

    const results = await Promise.all(urls.map(async (url) => {
      try {
        let targetUrl = url;
        let fileName = "external_doc";

        // Advanced Google Document Identification
        const docMatch = url.match(/\/d\/([\w_-]+)/);
        const docId = docMatch ? docMatch[1] : null;

        if (url.includes("docs.google.com/document") && docId) {
          targetUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
          fileName = `Doc-${docId}.pdf`;
        } else if (url.includes("drive.google.com/file") && docId) {
          targetUrl = `https://docs.google.com/uc?id=${docId}&export=download`;
          fileName = `Drive-${docId}.pdf`;
        } else {
          fileName = url.split("/").pop()?.split(/[?#]/)[0] || "external_doc";
        }

        const response = await axios.get(targetUrl, { 
          responseType: "arraybuffer", 
          maxRedirects: 5,
          timeout: 25000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });

        const contentType = (response.headers["content-type"] || "").toLowerCase();
        
        // Detection of "Private/Login Required" redirects for Google Docs
        if (contentType.includes("text/html") && url.includes("google.com")) {
          console.warn(`[ACCESS DENIED] Document ${url} is private or requires authentication.`);
          return null;
        }

        const file = {
          buffer: Buffer.from(response.data),
          originalname: fileName,
          mimetype: contentType,
        } as Express.Multer.File;

        // Web Extraction flow for generic sites
        if (contentType.includes("text/html")) {
          return this.processTextViaAI(file.buffer.toString(), ownerId, url);
        }

        return this.processFile(file, ownerId);
      } catch (error: any) {
        console.error(`[INGESTION FAULT] Link ${url}:`, error.message);
        return null;
      }
    }));

    return results.filter(Boolean);
  }

  private async processFile(file: Express.Multer.File, ownerId: string, email?: string) {
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;
    
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "pdf";
    const mime = file.mimetype.toLowerCase();
    let text = "";

    try {
      // 1. Text Extraction
      if (ext === "pdf" || mime.includes("pdf")) {
        const data = await pdf(file.buffer);
        text = data.text;
      } else if (ext === "docx" || ext === "doc" || mime.includes("word") || mime.includes("officedocument")) {
        // @ts-ignore
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value;
      }

      if (!text || text.trim().length < 50) return null;

      // 2. Document Persistence (Save to Registry Storage)
      const uploadDir = path.join(process.cwd(), "uploads", "resumes");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = `CV-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const resumeUrl = `uploads/resumes/${fileName}`;

      // 3. Metadata Extraction & Finalization
      return this.processTextViaAI(text, ownerId, file.originalname, email, resumeUrl);
    } catch (error: any) {
      console.error(`[EXTRACTION ERROR] ${file.originalname}:`, error.message);
      return null;
    }
  }

  private async processTextViaAI(rawText: string, ownerId: string, source: string, fallbackEmail?: string, resumeUrl?: string) {
    const geminiService = (await import("./gemini.service")).default;
    
    const prompt = `
      Perform a deep extraction of candidate metadata from the following document.
      SOURCE_REF: ${source}
      DOCUMENT_CONTENT: ${rawText.substring(0, 10000)}
      
      RESPOND ONLY WITH VALID JSON:
      {
        "name": "Full Name",
        "email": "Primary Email Address",
        "role": "Most relevant title or current role",
        "location": "Current City/Country",
        "experience": "High-level summary of professional tenure",
        "technicalProfile": "Dense summary of technical stack and expertise"
      }
    `;

    try {
      const result = await geminiService.executeWithRetry(prompt);
      const output = (await result.response).text();
      
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI response did not contain valid metadata.");
      
      const data = JSON.parse(jsonMatch[0]);

      const applicant = new Applicant({
        name: data.name || source.replace(/\.[^/.]+$/, ""),
        email: data.email || fallbackEmail || `${source.toLowerCase().replace(/[^a-z]/g, ".")}@registry.extern`,
        role: data.role || "Technical Professional",
        location: data.location || "Remote / Global",
        experience: data.experience || "Verified Profile",
        technicalProfile: data.technicalProfile || rawText.substring(0, 3000),
        resuméText: rawText,
        resumeUrl,
        ownerId,
      });

      return await applicant.save();
    } catch (e) {
      console.error("[AI DATA EXTRACTION FAULT]:", e);
      return null;
    }
  }

  async deleteApplicant(id: string) {
    return await Applicant.findByIdAndDelete(id);
  }
}

export default new ApplicantsService();
