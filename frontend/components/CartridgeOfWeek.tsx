'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Gamepad2, Play, Cpu, CheckCircle } from 'lucide-react';

export default function CartridgeOfWeek() {
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchResult, setBenchResult] = useState<string | null>(null);

  const runBenchmark = () => {
    setBenchmarking(true);
    setBenchResult(null);
    setTimeout(() => {
      setBenchmarking(false);
      setBenchResult('120.4 FPS @ 1% LOW 118 FPS (PASSED)');
    }, 2000);
  };

  return (
    <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg shadow-neo-lg p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Rating Stamp Sticker */}
      <div className="absolute top-3 right-3 bg-[#FF6B97] text-black border-2 border-black font-display font-black text-xs px-2.5 py-1 rounded-full shadow-neo-sm transform rotate-3">
        9.5 / 10
      </div>

      <div>
        {/* Header */}
        <div className="flex items-center gap-2 border-b-3 border-black pb-2 mb-3">
          <Gamepad2 className="w-4 h-4 text-[#FF8A3D]" />
          <span className="font-mono-code font-black text-xs text-black dark:text-white uppercase tracking-wider">
            CARTRIDGE OF THE WEEK
          </span>
        </div>

        {/* Game Media Thumbnail */}
        <div className="relative w-full aspect-[16/9] bg-black border-3 border-black rounded overflow-hidden shadow-neo-sm mb-3">
          <Image
            src="https://picsum.photos/seed/turbodrift/600/350"
            alt="Turbo Drift Overdrive"
            fill
            sizes="(max-width: 600px) 100vw, 400px"
            referrerPolicy="no-referrer"
            className="object-cover opacity-90 hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
            <span className="font-display font-black text-sm text-[#4DEEEA] uppercase tracking-wide">
              TURBO DRIFT: OVERDRIVE
            </span>
          </div>
        </div>

        <p className="font-sans font-medium text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A 2MB indie bullet-hell simulator built entirely on custom assembly code. Relentless, loud, and 100% free of seasonal battle passes.
        </p>
      </div>

      {/* Benchmark Action */}
      <div className="pt-3 border-t-3 border-black">
        {benchResult ? (
          <div className="bg-[#70E000] text-black border-2 border-black p-2 rounded text-[11px] font-mono-code font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {benchResult}
            </span>
            <button
              onClick={() => setBenchResult(null)}
              className="underline text-[10px]"
            >
              RESET
            </button>
          </div>
        ) : (
          <button
            onClick={runBenchmark}
            disabled={benchmarking}
            className="w-full bg-[#FF8A3D] hover:bg-[#ff7521] text-black border-3 border-black font-display font-black text-xs py-2.5 px-4 rounded shadow-neo-sm hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 uppercase cursor-pointer"
          >
            <Cpu className={`w-4 h-4 ${benchmarking ? 'animate-spin' : ''}`} />
            <span>{benchmarking ? 'RUNNING SIMULATION...' : 'LAUNCH SYSTEM BENCHMARK →'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
