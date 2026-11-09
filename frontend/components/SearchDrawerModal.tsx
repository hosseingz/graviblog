'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Sparkles, Terminal, ArrowRight, Loader2 } from 'lucide-react';
import { POSTS, Post } from '@/lib/posts';

interface SearchDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDrawerModal({ isOpen, onClose }: SearchDrawerModalProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'ai'>('search');
  
  // AI Intel state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPosts = useMemo(() => {
    if (!query.trim()) {
      return POSTS;
    }
    const q = query.toLowerCase();
    return POSTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  const handleAskAI = async (promptToUse?: string) => {
    const textPrompt = promptToUse || aiPrompt;
    if (!textPrompt.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    setMode('ai');

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          mode: 'search',
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setAiResponse(data.text);
      } else {
        setAiResponse(data.error || 'Failed to reach AI Intell node.');
      }
    } catch (err) {
      setAiResponse('Connection error while reaching Gemini AI server.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="w-full max-w-3xl bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg shadow-neo-lg overflow-hidden animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-[#FF8A3D] border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1 rounded">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-lg text-black uppercase tracking-tight">
              SEARCH INTEL & AI ASSISTANT
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 bg-black text-white hover:bg-[#FF6B97] hover:text-black border-2 border-black rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-[#fff9ef] dark:bg-[#12100e] border-b-2 border-black p-2 flex items-center gap-2">
          <button
            onClick={() => setMode('search')}
            className={`px-4 py-1.5 text-xs font-mono-code font-bold rounded border-2 transition-all cursor-pointer ${
              mode === 'search'
                ? 'bg-[#4DEEEA] text-black border-black shadow-neo-sm'
                : 'bg-transparent text-gray-700 dark:text-gray-300 border-transparent hover:border-black'
            }`}
          >
            🔍 DISPATCH ARCHIVE SEARCH
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`px-4 py-1.5 text-xs font-mono-code font-bold rounded border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'ai'
                ? 'bg-[#FF6B97] text-black border-black shadow-neo-sm'
                : 'bg-transparent text-gray-700 dark:text-gray-300 border-transparent hover:border-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>ASK GEMINI AI INTEL</span>
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-b-2 border-black bg-white dark:bg-[#2a2622] flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          {mode === 'search' ? (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, tags (e.g. 120hz, hall-effect, SNES, Tokyo)..."
              autoFocus
              className="w-full bg-transparent border-none text-sm font-bold font-sans text-black dark:text-white placeholder:text-gray-400 focus:outline-none"
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI();
              }}
              className="w-full flex items-center gap-2"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask AI anything about hardware specs, esports lag, or retro tech..."
                autoFocus
                className="w-full bg-transparent border-none text-sm font-bold font-sans text-black dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-[#FFE600] text-black border-2 border-black px-3 py-1 rounded text-xs font-mono-code font-black hover:bg-[#FF8A3D] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>DISPATCH</span>}
              </button>
            </form>
          )}
        </div>

        {/* Quick Suggestion Chips for AI */}
        {mode === 'ai' && (
          <div className="px-4 py-2 bg-[#FAF4EB] dark:bg-[#1a1714] border-b-2 border-black flex flex-wrap gap-2 items-center">
            <span className="font-mono-code text-[10px] font-bold text-gray-500">SUGGESTED QUERIES:</span>
            {[
              'Why is 120Hz crucial for competitive FPS?',
              'Sanwa vs Seimitsu fightstick gates explained',
              'Why hand-drawn 2.5D beats 3D raytracing for indies',
              'How to solder a GBA screen mod',
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(q);
                  handleAskAI(q);
                }}
                className="bg-white dark:bg-[#2a2622] text-black dark:text-white border border-black px-2 py-0.5 rounded text-[11px] font-mono-code hover:bg-[#4DEEEA] hover:text-black transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {mode === 'search' ? (
            filteredPosts.length === 0 ? (
              <div className="p-8 text-center font-mono-code text-sm text-gray-500">
                NO DISPATCHES MATCHED &quot;{query}&quot;. TRY ANOTHER SEARCH OR ASK GEMINI AI INTEL.
              </div>
            ) : (
              filteredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/articles/${post.slug}`}
                  onClick={onClose}
                  className="block p-3.5 bg-white dark:bg-[#2a2622] border-2 border-black rounded hover:bg-[#FAF4EB] dark:hover:bg-[#322c28] hover:border-black shadow-neo-sm hover:shadow-neo transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-mono-code font-black px-2 py-0.5 rounded border border-black ${post.categoryColor}`}>
                      {post.category}
                    </span>
                    <span className="text-[11px] font-mono-code text-gray-500">
                      {post.readTime} · {post.publishDate}
                    </span>
                  </div>

                  <h4 className="font-display font-black text-base mt-1.5 text-black dark:text-white group-hover:text-[#FF8A3D] transition-colors">
                    {post.title}
                  </h4>

                  <p className="text-xs font-sans text-gray-600 dark:text-gray-300 line-clamp-1 mt-1">
                    {post.excerpt}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono-code text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>BY {post.author.name}</span>
                    <span className="flex items-center gap-1 font-bold text-black dark:text-white group-hover:translate-x-1 transition-transform">
                      READ DISPATCH <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))
            )
          ) : (
            // AI Response View
            <div className="space-y-4">
              {aiLoading ? (
                <div className="p-8 flex flex-col items-center justify-center gap-3">
                  <div className="bg-[#FF6B97] text-black border-3 border-black p-3 rounded-full animate-bounce shadow-neo">
                    <Sparkles className="w-6 h-6 fill-black" />
                  </div>
                  <span className="font-mono-code font-bold text-xs uppercase tracking-wider text-black dark:text-white">
                    QUERYING GEMINI AI INTEL NODE...
                  </span>
                </div>
              ) : aiResponse ? (
                <div className="bg-white dark:bg-[#2a2622] border-3 border-black p-4 rounded-md shadow-neo">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <span className="font-mono-code text-xs font-black bg-[#FFE600] text-black px-2 py-0.5 rounded border border-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> GEMINI AI DISPATCH RESPONSE
                    </span>
                    <span className="text-[10px] font-mono-code text-gray-500">VERIFIED HIGH-INTEL</span>
                  </div>
                  <div className="font-sans text-sm leading-relaxed whitespace-pre-line text-black dark:text-white font-medium">
                    {aiResponse}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center font-mono-code text-xs text-gray-500">
                  ASK GEMINI AI INTEL A QUESTION ABOVE TO RECEIVE AN UNFILTERED TECHNICAL DISPATCH.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer status bar */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-t-2 border-black p-3 flex items-center justify-between text-xs font-mono-code font-bold text-gray-600 dark:text-gray-400">
          <span>{filteredPosts.length} DISPATCHES INDEXED</span>
          <span>PRESS ESC TO EXIT</span>
        </div>
      </div>
    </div>
  );
}
