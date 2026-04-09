"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Upload,
  FileText,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  AlertCircle,
  Mail,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface UploadDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UploadDossierModal = ({
  isOpen,
  onClose,
  onSuccess,
}: UploadDossierModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      const newFiles = Array.from(e.target.files).filter((f) =>
        allowedTypes.includes(f.type),
      );
      if (newFiles.length < e.target.files.length) {
        toast.warning("Please only upload PDF or DOCX resumes.");
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const addUrl = () => {
    if (!currentUrl.trim()) return;
    if (!currentUrl.startsWith("http")) {
      toast.error("Please provide a valid URL starting with http:// or https://");
      return;
    }
    setUrls((prev) => [...prev, currentUrl.trim()]);
    setCurrentUrl("");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 && urls.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("dossiers", file);
    });

    // Append URLs to the formData
    urls.forEach((url) => {
      formData.append("urls", url);
    });

    try {
      setUploadProgress(40);
      const response = await api.post("/applicants/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        setUploadProgress(100);
        toast.success(
          `Success! ${response.data.data.length} candidate profiles have been ingested.`,
        );
        onSuccess();
        setTimeout(onClose, 800);
      }
    } catch (error: any) {
      console.error("Ingestion Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Something went wrong during ingestion. Please try again.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-aurora-dark/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-aurora-surface rounded-3xl border border-aurora-border shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-aurora-border/50 flex items-start justify-between bg-aurora-bg/30">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-aurora-blue flex items-center justify-center shadow-lg shadow-aurora-blue/20">
                  <Upload className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-aurora-dark uppercase tracking-tight">
                    Upload New Resumes
                  </h2>
                  <p className="text-[10px] font-bold text-aurora-muted uppercase tracking-widest leading-none mt-1">
                    Add candidate resumes to your account
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-aurora-muted hover:text-aurora-blue hover:bg-white rounded-xl border border-transparent hover:border-aurora-border transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* File Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-aurora-muted uppercase tracking-widest block">
                  Step 1: Upload PDF/DOCX Documents
                </label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
                    isUploading
                      ? "border-aurora-border bg-aurora-bg/10"
                      : "border-aurora-border/50 hover:border-aurora-blue hover:bg-aurora-blue/5 cursor-pointer"
                  }`}
                  onClick={() =>
                    !isUploading && document.getElementById("fileInput")?.click()
                  }
                >
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                  />
                  <FileText
                    className={`size-12 mb-4 ${isUploading ? "text-aurora-border animate-pulse" : "text-aurora-muted group-hover:text-aurora-blue"}`}
                  />
                  <div className="text-center">
                    <p className="text-xs font-black text-aurora-dark uppercase tracking-widest">
                      Select Resumes
                    </p>
                    <p className="text-[10px] font-bold text-aurora-muted uppercase tracking-widest mt-1">
                      Drag and drop PDF or DOCX files
                    </p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-aurora-bg border border-aurora-border rounded-xl">
                        <div className="flex items-center gap-3">
                          <FileText className="size-4 text-aurora-blue" />
                          <span className="text-[11px] font-bold text-aurora-dark truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="p-1 hover:text-rose-500 transition-colors"><X className="size-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link Section */}
              <div className="space-y-3 pt-6 border-t border-aurora-border/50">
                <label className="text-[10px] font-black text-aurora-muted uppercase tracking-widest block">
                  Step 2: Add Document Links (Optional)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    placeholder="https://example.com/resume.pdf"
                    className="flex-1 bg-white border border-aurora-border rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-aurora-blue"
                    onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                  />
                  <button 
                    onClick={addUrl}
                    className="p-3 bg-aurora-blue/10 text-aurora-blue rounded-xl hover:bg-aurora-blue hover:text-white transition-all"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>

                {urls.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {urls.map((url, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          <span className="text-[11px] font-bold text-emerald-700 truncate max-w-[200px]">{url}</span>
                        </div>
                        <button onClick={() => removeUrl(i)} className="p-1 hover:text-rose-500 transition-colors"><X className="size-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-[10px] font-black text-aurora-blue uppercase tracking-widest">
                    <span>Processing Ingestion Pipeline...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-aurora-bg border border-aurora-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-aurora-blue rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-aurora-border/50 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || (files.length === 0 && urls.length === 0)}
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-aurora-blue/20 disabled:opacity-50"
                >
                  {isUploading ? (
                    <RefreshCcw className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  <span>
                    {isUploading
                      ? "Ingesting..."
                      : `Ingest ${files.length + urls.length} Profiles`}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UploadDossierModal;
