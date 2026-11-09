'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import { Terminal, Shield, Cpu, Flame, Send, CheckCircle, Sparkles, Zap, Award } from 'lucide-react';

export default function AboutPage() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Test bench simulator state
  const [gpu, setGpu] = useState('RTX 4080 SUPER');
  const [hz, setHz] = useState<number>(120);
  const [panelType, setPanelType] = useState('OLED');
  const [simulatedLag, setSimulatedLag] = useState<number | null>(null);

  // Tip form state
  const [tipHandle, setTipHandle] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [tipSent, setTipSent] = useState(false);

  const calculateSimulatedLag = () => {
    let base = 1000 / hz;
    if (panelType === 'IPS') base += 3.5;
    if (panelType === 'TN') base += 1.8;
    if (panelType === 'OLED') base += 0.2;
    setSimulatedLag(parseFloat(base.toFixed(2)));
  };

  const handleSendTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (tipMessage.trim()) {
      setTipSent(true);
      setTimeout(() => {
        setTipSent(false);
        setTipMessage('');
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7]">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        {/* Page Hero Banner */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-10 shadow-neo-lg relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
              EDITORIAL MANIFESTO
            </span>
            <span className="bg-[#4DEEEA] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
              EST. 2024 // TOKYO & LA
            </span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tight text-black dark:text-white leading-[0.98]">
            GRAVIBLOG // THE UNFILTERED PIXEL PUNCH CREED
          </h1>

          <p className="font-sans font-medium text-base sm:text-lg text-gray-800 dark:text-gray-200 mt-4 max-w-3xl leading-relaxed">
            We built Graviblog because modern gaming journalism became a sterile marketing extension for $70 AAA pre-orders, corporate PR embargoes, and soulless battle pass hype cycles. We write for hardware hackers, CRT purists, handheld modders, and indie rebels.
          </p>
        </div>

        {/* 5 Core Editorial Tenets */}
        <section className="space-y-6">
          <div className="border-b-3 border-black pb-2">
            <h2 className="font-display font-black text-3xl uppercase tracking-tight text-black dark:text-white">
              {"/// OUR 5 NON-NEGOTIABLE TENETS"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'NO EMBARGO GAG ORDERS',
                color: 'bg-[#FF8A3D]',
                desc: 'We never sign NDAs that restrict our honest hardware tear-downs or frame-rate benchmark critiques.',
              },
              {
                num: '02',
                title: 'ZERO SPONSORED RATINGS',
                color: 'bg-[#FF6B97]',
                desc: 'Our scorecards are earned on oscilloscopes and high-speed photon probes. No publisher kickbacks ever.',
              },
              {
                num: '03',
                title: 'HARDWARE FORENSICS',
                color: 'bg-[#4DEEEA]',
                desc: 'From GBA dashboard mods to Sanwa 4-way gate travel, we measure microswitch actuation in millimeters.',
              },
              {
                num: '04',
                title: '120HZ REALITY DISCIPLINE',
                color: 'bg-[#FFE600]',
                desc: 'We test render lag at the photon level. 60Hz is obsolete for competitive play and we back it up with data.',
              },
              {
                num: '05',
                title: '100% READER FUNDED',
                color: 'bg-[#70E000]',
                desc: 'Supported by physical zine subscribers and underground supporters. Zero intrusive ad-network clutter.',
              },
            ].map((tenet, idx) => (
              <div
                key={idx}
                className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg p-6 shadow-neo space-y-3 relative overflow-hidden"
              >
                <div className={`w-10 h-10 rounded border-2 border-black ${tenet.color} text-black font-display font-black text-lg flex items-center justify-center shadow-neo-sm`}>
                  {tenet.num}
                </div>
                <h3 className="font-display font-black text-xl text-black dark:text-white uppercase">
                  {tenet.title}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                  {tenet.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Hardware Test Bench Simulator */}
        <section className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-3 border-black pb-4">
            <div>
              <span className="bg-[#FFE600] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
                LAB INTERACTIVE
              </span>
              <h2 className="font-display font-black text-3xl uppercase tracking-tight text-black dark:text-white mt-1">
                HARDWARE LATENCY & RENDER SIMULATOR
              </h2>
            </div>
            <span className="font-mono-code text-xs font-bold text-gray-500">
              SIMULATE DISPLAY REFRESH DELTA
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4 font-mono-code text-xs font-bold">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">SELECT GPU PIPELINE</label>
                <select
                  value={gpu}
                  onChange={(e) => setGpu(e.target.value)}
                  className="w-full bg-white dark:bg-[#2a2622] text-black dark:text-white border-2 border-black p-2.5 rounded shadow-neo-sm"
                >
                  <option value="RTX 4080 SUPER">NVIDIA RTX 4080 SUPER 16GB</option>
                  <option value="RX 7900 XTX">AMD RADEON RX 7900 XTX</option>
                  <option value="STEAM DECK OLED">VALVE STEAM DECK APU (15W)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">TARGET REFRESH RATE (HZ)</label>
                <div className="flex items-center gap-2">
                  {[60, 120, 240, 360].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setHz(rate)}
                      className={`flex-1 py-2 rounded border-2 border-black font-black transition-all cursor-pointer ${
                        hz === rate
                          ? 'bg-[#FF8A3D] text-black shadow-neo-sm'
                          : 'bg-white dark:bg-[#2a2622] text-black dark:text-white hover:bg-[#FFE600] hover:text-black'
                      }`}
                    >
                      {rate} HZ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">PANEL MATRIX TYPE</label>
                <div className="flex items-center gap-2">
                  {['OLED', 'IPS', 'TN'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPanelType(p)}
                      className={`flex-1 py-2 rounded border-2 border-black font-black transition-all cursor-pointer ${
                        panelType === p
                          ? 'bg-[#4DEEEA] text-black shadow-neo-sm'
                          : 'bg-white dark:bg-[#2a2622] text-black dark:text-white hover:bg-[#FF6B97] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={calculateSimulatedLag}
                className="w-full bg-[#FFE600] hover:bg-[#FF8A3D] text-black border-3 border-black font-display font-black text-sm py-3 rounded shadow-neo uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                <span>CALCULATE FRAME TIME LATENCY</span>
              </button>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-6 bg-white dark:bg-[#2a2622] border-3 border-black p-6 rounded-lg shadow-neo text-center space-y-3">
              <span className="font-mono-code text-xs font-black bg-black text-white px-2.5 py-0.5 rounded">
                SIMULATED PHOTON INTERVAL
              </span>

              {simulatedLag !== null ? (
                <div className="space-y-2">
                  <div className="font-display font-black text-5xl sm:text-6xl text-[#FF8A3D]">
                    {simulatedLag} <span className="text-2xl text-black dark:text-white">MS</span>
                  </div>
                  <p className="font-sans text-xs text-gray-700 dark:text-gray-300 font-bold">
                    {hz >= 120
                      ? '⚡ VERIFIED COMPETITIVE LEVEL! Zero motion blur and minimal input queue lag.'
                      : '⚠️ WARNING: 60Hz baseline lag introduces ~16.6ms frame pacing delay! Upgrade recommended.'}
                  </p>
                </div>
              ) : (
                <p className="font-mono-code text-xs text-gray-500 py-6">
                  SELECT YOUR HARDWARE PARAMETERS AND CLICK CALCULATE ABOVE TO RUN PHOTON BENCHMARK.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Editorial Team Roster */}
        <section className="space-y-6">
          <div className="border-b-3 border-black pb-2">
            <h2 className="font-display font-black text-3xl uppercase tracking-tight text-black dark:text-white">
              {"/// EDITORIAL STAFF & HARDWARE CORRESPONDENTS"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'ALEX VANCE',
                role: 'HARDWARE & BENCHMARK EDITOR',
                handle: '@VANCE_HW',
                avatar: 'AV',
                color: 'bg-[#FF8A3D]',
                bio: 'Obsessed with oscilloscope frame times, thermal throttling, and uncompromised CRT clarity. 15 years fixing down-clocking hardware.',
              },
              {
                name: 'REN "GLITCH" VASQUEZ',
                role: 'DECK ARCHITECT & LINUX KERNEL',
                handle: '@GLITCH_DECK',
                avatar: 'RV',
                color: 'bg-[#FF6B97]',
                bio: 'Compiling custom Linux kernels for handheld consoles. Loves 15W TDP limits and handheld micro-hardware.',
              },
              {
                name: 'ROCCO VALENTINE',
                role: 'CHIEF CRT CORRESPONDENT',
                handle: '@ROCCO_CRT',
                avatar: 'RV',
                color: 'bg-[#4DEEEA]',
                bio: 'Hunting down arcade ROM dumps, preservation rigs, and analog signal converters across Tokyo back alleys.',
              },
              {
                name: 'KIRA THORNE',
                role: 'HARDWARE ENGINEER',
                handle: '@KIRA_HARDWARE',
                avatar: 'KT',
                color: 'bg-[#70E000]',
                bio: 'Building custom PCBs, Hall-Effect levers, and ultra-low debounce logic controllers for fightsticks.',
              },
              {
                name: 'DEX ORTIZ',
                role: 'CULTURE ESSAYIST',
                handle: '@DEX_RUNS',
                avatar: 'DO',
                color: 'bg-[#FFE600]',
                bio: 'Analyzing speedrun geometry breakages and 3D engine physics anomalies in classic games.',
              },
            ].map((staff, idx) => (
              <div
                key={idx}
                className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg p-5 shadow-neo space-y-3"
              >
                <div className="flex items-center gap-3 border-b-2 border-black pb-3">
                  <div className={`w-12 h-12 rounded border-2 border-black ${staff.color} text-black font-mono-code font-black text-lg flex items-center justify-center shadow-neo-sm`}>
                    {staff.avatar}
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-black dark:text-white uppercase leading-tight">
                      {staff.name}
                    </h3>
                    <span className="font-mono-code text-xs text-gray-600 dark:text-gray-400 font-bold">
                      {staff.role}
                    </span>
                  </div>
                </div>

                <p className="font-sans text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                  {staff.bio}
                </p>

                <div className="font-mono-code text-[11px] font-black text-[#FF8A3D]">
                  {staff.handle}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tip Submission / Underground Leaks Form */}
        <section id="donate" className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg space-y-4">
          <div className="border-b-3 border-black pb-3">
            <span className="bg-[#FF6B97] text-white border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
              ENCRYPTED TIP LINE
            </span>
            <h2 className="font-display font-black text-3xl uppercase tracking-tight text-black dark:text-white mt-1">
              SUBMIT AN UNDERGROUND TIP OR HARDWARE LEAK
            </h2>
          </div>

          {tipSent ? (
            <div className="bg-[#70E000] border-3 border-black p-4 rounded font-mono-code text-xs font-bold text-black flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>TIP ENCRYPTED & TRANSMITTED TO DESK. APPRECIATED PILOT.</span>
            </div>
          ) : (
            <form onSubmit={handleSendTip} className="space-y-3">
              <div>
                <label className="block font-mono-code text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  CALLSIGN / ANONYMOUS HANDLE
                </label>
                <input
                  type="text"
                  value={tipHandle}
                  onChange={(e) => setTipHandle(e.target.value)}
                  placeholder="E.G. DECK_LEAKER_09"
                  className="w-full bg-white dark:bg-[#2a2622] border-2 border-black p-2.5 text-xs font-mono-code text-black dark:text-white rounded shadow-neo-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-code text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ENCRYPTED MESSAGE / LEAK DETAILS
                </label>
                <textarea
                  rows={4}
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  placeholder="Provide firmware schematics, hardware prototypes, unannounced specs..."
                  required
                  className="w-full bg-white dark:bg-[#2a2622] border-2 border-black p-3 text-xs font-mono-code text-black dark:text-white rounded shadow-neo-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="bg-[#FF8A3D] hover:bg-[#ff7521] text-black border-3 border-black font-display font-black text-xs px-6 py-3 rounded shadow-neo uppercase cursor-pointer flex items-center gap-2"
              >
                <span>TRANSMIT ENCRYPTED TIP</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </section>
      </main>

      <Footer />
      <SearchDrawerModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
