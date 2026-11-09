'use client';

import React, { useState } from 'react';
import { Sparkles, X, Loader2, Copy, Check } from 'lucide-react';

interface AISummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  articleContent: string;
}

export default function AISummarizerModal({
  isOpen,
  onClose,
  articleTitle,
  articleContent,
}: AISummarizerModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setSummary(null);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'summarize',
          articleTitle,
          articleContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setSummary(data.text);
      } else {
        setSummary('Failed to generate summary: ' + (data.error || 'Server error.'));
      }
    } catch {
      setSummary('Failed to reach Gemini AI node.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg shadow-neo-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-[#FF8A3D] border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1 rounded">
              <Sparkles className="w-5 h-5 fill-black text-white" />
            </div>
            <span className="font-display font-black text-lg text-black uppercase tracking-tight">
              GEMINI AI ARTICLE INTELL ★ TL;DR
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 bg-black text-white hover:bg-[#FF6B97] hover:text-black border-2 border-black rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title context */}
        <div className="bg-[#FFE600] border-b-2 border-black p-3 font-mono-code text-xs font-bold text-black truncate">
          DISPATCH: &quot;{articleTitle}&quot;
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#FF8A3D] animate-spin stroke-[3]" />
              <span className="font-mono-code text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                SYNTHESIZING UNAPOLOGETIC NEO-BRUTALIST TAKEAWAYS...
              </span>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="bg-[#FAF4EB] dark:bg-[#2a2622] border-3 border-black p-4 rounded-md shadow-neo">
                <div className="font-mono-code text-xs font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1 flex justify-between">
                  <span>UNFILTERED TECHNICAL SUMMARY</span>
                  <span className="text-[#FF8A3D] font-black">GEMINI 2.5 FLASH</span>
                </div>
                <div className="font-sans text-sm sm:text-base leading-relaxed whitespace-pre-line text-black dark:text-white font-medium">
                  {summary}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={copyToClipboard}
                  className="bg-[#4DEEEA] hover:bg-[#30dcd8] text-black border-2 border-black font-mono-code text-xs font-black px-4 py-2 rounded shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SUMMARY'}</span>
                </button>

                <button
                  onClick={generateSummary}
                  className="bg-white dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-xs font-bold px-3 py-2 rounded hover:bg-[#FAF4EB] transition-colors cursor-pointer"
                >
                  RE-GENERATE
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center gap-4">
              <p className="font-mono-code text-xs text-gray-600 dark:text-gray-300 font-bold">
                READY TO GENERATE UNFILTERED NEO-BRUTALIST SUMMARY WITH GEMINI AI?
              </p>
              <button
                onClick={generateSummary}
                className="bg-[#FF8A3D] hover:bg-[#ff7521] text-black border-3 border-black font-display font-black text-xs px-6 py-3 rounded shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>GENERATE SUMMARY NOW</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
