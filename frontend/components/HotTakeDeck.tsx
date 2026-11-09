'use client';

import React, { useState, useEffect } from 'react';
import { Zap, MessageSquare, ThumbsUp } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';

export default function HotTakeDeck() {
  const [takeIndex, setTakeIndex] = useState(0);
  const [takes, setTakes] = useState<any[]>([]);
  const [upvotes, setUpvotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // In lieu of a direct endpoint, let's fetch a few popular posts and use them as "hot takes"
    const fetchTakes = async () => {
      try {
        const response = await apiClient.get('/api/v1/posts/?ordering=popular');
        const results = response.data.results || response.data || [];
        const hotTakes = results.slice(0, 5).map((r: any) => ({
            opinion: r.title,
            body: r.excerpt,
            totalVotes: r.likes_count,
        }));
        if (hotTakes.length > 0) {
            setTakes(hotTakes);
            setUpvotes(hotTakes[0].totalVotes);
        }
      } catch (e) {
        console.error('Failed to fetch hot takes', e);
      }
    };
    fetchTakes();
  }, []);

  const take = takes[takeIndex] || { opinion: 'Loading...', body: 'Loading...', totalVotes: 0 };

  const handleVote = () => {
    if (!hasVoted && takes.length > 0) {
      setUpvotes((prev) => prev + 1);
      setHasVoted(true);
    }
  };

  return (
    <div className="bg-[#4DEEEA] border-4 border-black rounded-lg shadow-neo-lg p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b-3 border-black pb-2 mb-3">
          <span className="font-mono-code font-black text-xs text-black uppercase tracking-wider flex items-center gap-1">
            CRITIQUE // HOT TAKE DECK
          </span>
          <Zap className="w-4 h-4 fill-black text-black" />
        </div>

        {/* Unpopular Opinion Stamp */}
        <div className="inline-block bg-[#FF6B97] text-black border-2 border-black font-mono-code text-[10px] font-black px-2 py-0.5 rounded shadow-neo-sm mb-3">
          UNPOPULAR OPINION #93
        </div>

        {/* Headline Quote */}
        <h3 className="font-display font-black text-2xl text-black uppercase tracking-tight leading-tight mb-3">
          {take.opinion}
        </h3>

        <p className="font-sans font-medium text-black text-xs leading-relaxed mb-4">
          {take.body}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t-3 border-black flex items-center gap-2">
        <button
          onClick={handleVote}
          className={`flex-1 ${
            hasVoted ? 'bg-[#70E000]' : 'bg-[#FAF4EB] hover:bg-white'
          } text-black border-2 border-black font-mono-code text-xs font-black py-2 px-3 rounded shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>AGREE? {Math.round((upvotes / (upvotes + 40)) * 100) || 0}% UPVOTE</span>
        </button>

        <button
          onClick={() => {
              if (takes.length > 0) {
                  const newIdx = (takeIndex + 1) % takes.length;
                  setTakeIndex(newIdx);
                  setUpvotes(takes[newIdx].totalVotes);
                  setHasVoted(false);
              }
          }}
          className="bg-black text-white hover:bg-[#FF8A3D] hover:text-black border-2 border-black font-mono-code text-xs font-black py-2 px-3 rounded shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>SOUND OFF ({Math.round(take.totalVotes / 10)})</span>
        </button>
      </div>
    </div>
  );
}
