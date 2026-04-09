"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Trash2, 
  ShieldCheck, 
  Briefcase, 
  Search,
  Zap,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";

interface Message {
  role: "user" | "model";
  content: string;
}

/* 
  High-Performance Robust Markdown Interpreter
  Structural Line Processor for AI-Generated Technical Narratives
  Extended to support: Tables, Headers, Bold, and Lists.
*/
const MarkdownLite = ({ text }: { text: string }) => {
  const processLine = (line: string) => {
    let formatted = line
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-[#020617]">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-[#1E293B]">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#DC2626] font-bold font-mono text-[11px]">$1</code>');
    return formatted;
  };

  const lines = (text || "").split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentTable: string[][] = [];

  const flushTable = (index: number) => {
    if (currentTable.length === 0) return;
    
    // Check if it's a real table (has header and separator)
    const hasSeparator = currentTable[1]?.some(cell => cell.includes("---"));
    const tableData = hasSeparator ? [currentTable[0], ...currentTable.slice(2)] : currentTable;

    elements.push(
      <div key={`table-${index}`} className="overflow-x-auto my-4 border border-[#CBD5E1] rounded-xl shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1]">
              {tableData[0].map((cell, ci) => (
                <th key={ci} className="px-4 py-3 font-black text-[#020617] uppercase tracking-wider" dangerouslySetInnerHTML={{ __html: processLine(cell) }} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {tableData.slice(1).map((row, ri) => (
              <tr key={ri} className="bg-white hover:bg-[#F8FAFC] transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-[#0F172A] font-medium" dangerouslySetInnerHTML={{ __html: processLine(cell) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Table Row Detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(c => c !== "").map(c => c.trim());
      currentTable.push(cells);
      return;
    } else {
      flushTable(i);
    }

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-[13px] font-black uppercase tracking-widest text-[#2563EB] mt-6 pb-2 border-b-2 border-[#E2E8F0]">{trimmed.replace("### ", "")}</h3>);
    }
    // Lists
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2);
      elements.push(
        <div key={i} className="flex gap-4 pl-3 items-start group">
          <span className="text-[#3B82F6] mt-2 w-2 h-2 rounded-full bg-[#2563EB] shrink-0 border border-white shadow-sm" />
          <div className="text-[14px] leading-relaxed text-[#0F172A] font-medium" dangerouslySetInnerHTML={{ __html: processLine(content) }} />
        </div>
      );
    }
    // Standard Paragraph
    else {
      elements.push(
        <div 
          key={i} 
          className="text-[14px] leading-relaxed text-[#0F172A] font-medium" 
          dangerouslySetInnerHTML={{ __html: processLine(line) }} 
        />
      );
    }
  });

  flushTable(lines.length);

  return <div className="space-y-4">{elements}</div>;
};

const ChatPage = () => {
  const { notify } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Protocol Initiated. I am the Scrutiq AI Agent. How can I assist your recruitment operations today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await api.post("/chat/message", {
        message: input,
        history: messages,
      });

      if (response.data.status === "success") {
        setMessages((prev) => [...prev, response.data.data]);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Unable to contact the central brain.";
      notify(`AI Sync Fault: ${errorMsg}`, "error");
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        content: "Memory Purged. Systems Reset. How can I assist you now?",
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-aurora-surface p-6 rounded-3xl border border-aurora-border shadow-sm gap-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-aurora-blue flex items-center justify-center shadow-lg shadow-aurora-blue/20">
            <Bot className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-aurora-dark tracking-tighter">
              AI Command Center
            </h1>
            <p className="text-[10px] font-bold text-aurora-muted uppercase tracking-widest leading-none mt-1 flex items-center gap-1.5">
              <Zap className="size-3 text-amber-500 fill-amber-500" />
              Connected to Gemini technical brain
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-3 text-aurora-muted hover:text-rose-500 hover:bg-rose-50 rounded-2xl border border-transparent hover:border-rose-100 transition-all"
          title="Clear memory"
        >
          <Trash2 className="size-5" />
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-aurora-surface rounded-3xl border border-aurora-border shadow-sm flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-aurora-bg/30 pointer-events-none" />
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`size-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm border ${
                  msg.role === "user" 
                    ? "bg-white border-aurora-border text-aurora-dark" 
                    : "bg-aurora-blue border-aurora-blue text-white"
                }`}>
                  {msg.role === "user" ? <User className="size-5" /> : <Bot className="size-5" />}
                </div>
                <div className={`max-w-[85%] md:max-w-[75%] overflow-hidden ${
                  msg.role === "user" ? "ml-auto" : "mr-auto"
                }`}>
                  <div className={`px-5 py-3.5 rounded-2xl shadow-sm border ${
                    msg.role === "user"
                      ? "bg-[#3A6EF2] text-white border-[#2A5EE2] rounded-tr-sm"
                      : "bg-white text-[#1E293B] border-[#E2E8F0] rounded-tl-sm"
                  }`}>
                    <MarkdownLite text={msg.content} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <div className="flex gap-4 items-center animate-pulse">
              <div className="size-10 rounded-xl bg-aurora-blue flex items-center justify-center">
                <Bot className="size-5 text-white" />
              </div>
              <div className="bg-aurora-bg px-5 py-3 rounded-2xl border border-aurora-border/50 flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-aurora-blue" />
                <span className="text-[10px] font-black text-aurora-muted uppercase tracking-widest">
                  Analyzing registry...
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-aurora-border/50 bg-white relative z-10">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask me to rank candidates, trigger screenings, or listing active jobs..."
              className="flex-1 bg-aurora-bg border border-aurora-border rounded-2xl px-6 py-4 text-sm font-bold text-aurora-dark focus:outline-none focus:border-aurora-blue focus:ring-4 focus:ring-aurora-blue/5 transition-all placeholder:text-aurora-muted/50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="bg-aurora-blue text-white p-4 rounded-2xl shadow-lg shadow-aurora-blue/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isTyping ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />}
            </button>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-aurora-muted uppercase tracking-widest bg-aurora-bg px-2 py-1 rounded-md border border-aurora-border/50">
              <ShieldCheck className="size-3 text-aurora-blue" /> Screen Candidates
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-aurora-muted uppercase tracking-widest bg-aurora-bg px-2 py-1 rounded-md border border-aurora-border/50">
              <Briefcase className="size-3 text-aurora-blue" /> List Registry
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-aurora-muted uppercase tracking-widest bg-aurora-bg px-2 py-1 rounded-md border border-aurora-border/50">
              <Activity className="size-3 text-aurora-blue" /> Modify Criteria
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
