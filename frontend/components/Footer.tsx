'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Terminal, Send, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 5000);
    }
  };

  return (
    <footer className="w-full bg-[#FAF4EB] dark:bg-[#1a1714] border-t-4 border-black mt-16 text-black dark:text-white">
      {/* Top Newsletter Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="bg-[#FF8A3D] border-4 border-black p-6 sm:p-8 rounded-lg shadow-neo-lg relative overflow-hidden">
          {/* Decorative sticker tag */}
          <div className="absolute top-3 left-4 bg-[#FF6B97] text-black border-2 border-black font-mono-code text-[10px] font-black px-2 py-0.5 rounded transform -rotate-2 shadow-neo-sm">
            VIP DISPATCH
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7">
              <h3 className="font-display font-black text-2xl sm:text-3xl text-black uppercase tracking-tight">
                JOIN THE PIXEL RESISTANCE
              </h3>
              <p className="font-sans font-medium text-black text-sm sm:text-base mt-1 max-w-xl">
                Secret codes, unhinged industry critiques, hardware diagrams, and arcade culture dispatches delivered straight to your terminal weekly.
              </p>
            </div>

            <div className="lg:col-span-5">
              {subscribed ? (
                <div className="bg-[#70E000] border-3 border-black p-3.5 rounded-md shadow-neo text-black font-bold flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                  <span>COMM CHANNEL ESTABLISHED! CHECK YOUR INBOX.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER YOUR COMMS EMAIL..."
                    required
                    className="flex-1 bg-white border-3 border-black p-3 text-xs font-mono-code font-bold placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-black shadow-neo-sm"
                  />
                  <button
                    type="submit"
                    className="bg-[#4DEEEA] hover:bg-[#30dcd8] text-black border-3 border-black font-display font-black text-xs px-6 py-3 rounded-md shadow-neo hover:shadow-neo-lg active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap uppercase flex items-center justify-center gap-2"
                  >
                    <span>PLUG IN</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Footer Section */}
        <div className="mt-12 pt-8 border-t-2 border-black/20 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE600] text-black border-2 border-black p-1.5 shadow-neo-sm rounded-sm">
              <Terminal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-display font-black text-xl tracking-tight uppercase">
              PIXEL PUNCH // GRAVIBLOG
            </span>
          </div>

          {/* Sticker Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="bg-[#FAF4EB] dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-[11px] font-bold px-3 py-1 rounded-full shadow-neo-sm">
              NO ALGORITHMS
            </span>
            <span className="bg-[#FAF4EB] dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-[11px] font-bold px-3 py-1 rounded-full shadow-neo-sm">
              100% INDIE
            </span>
            <span className="bg-[#FAF4EB] dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-[11px] font-bold px-3 py-1 rounded-full shadow-neo-sm">
              LO-FI POWER
            </span>
          </div>

          {/* Copyright */}
          <div className="font-mono-code text-xs text-gray-600 dark:text-gray-400 font-medium">
            © 2025 PIXEL PUNCH MEDIA GROUP. ZERO APOLOGIES.
          </div>
        </div>
      </div>
    </footer>
  );
}
