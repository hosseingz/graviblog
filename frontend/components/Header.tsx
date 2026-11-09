'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, User, Moon, Sun, Terminal } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  return (
    <header className="w-full bg-[#FAF4EB] dark:bg-[#1e1b18] border-b-4 border-black sticky top-0 z-40">
      {/* Marquee Ticker Top Strip */}
      <div className="bg-[#FF8A3D] text-black font-mono-code text-xs font-bold py-1.5 border-b-2 border-black overflow-hidden flex items-center">
        <div className="animate-marquee shrink-0 flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[10px] tracking-wider">NEW ISSUE</span>
            ★ FRESH DROPS DAILY // 100% UNAPOLOGETIC // ZERO CORPORATE PR ★ RADICAL GAMING & TECH FORENSICS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-[#FF6B97] text-black border border-black px-1.5 py-0.5 rounded-sm text-[10px]">VERIFIED LO-FI</span>
            120HZ ESPORTS REALITY // CRT PHOSPHOR LOVE // SOLDERED HANDHELDS ★ NO EMBARGO GAG ORDERS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-[#4DEEEA] text-black border border-black px-1.5 py-0.5 rounded-sm text-[10px]">ISSUE #084</span>
            ★ FRESH DROPS DAILY // 100% UNAPOLOGETIC // ZERO CORPORATE PR ★ RADICAL GAMING & TECH FORENSICS
          </span>
        </div>
      </div>

      {/* Main Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <Link 
          href="/" 
          className="group flex items-center gap-3 shrink-0 focus:outline-none"
        >
          <div className="bg-[#FF8A3D] text-black border-3 border-black p-1.5 shadow-neo-sm group-hover:bg-[#FF6B97] transition-colors rounded-sm">
            <Terminal className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-2xl sm:text-3xl tracking-tight leading-none text-black dark:text-white uppercase">
              PIXEL PUNCH
            </span>
            <span className="font-mono-code text-[11px] font-bold text-[#564338] dark:text-[#ddc1b3] tracking-wider">
              GRAVIBLOG // PRESS PLAY NO BS
            </span>
          </div>
        </Link>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3">
          <Link
            href="/"
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border-2 transition-all ${
              pathname === '/'
                ? 'bg-[#FF8A3D] text-black border-black shadow-neo-sm'
                : 'bg-transparent text-black dark:text-white border-transparent hover:border-black hover:bg-[#fff9ef] dark:hover:bg-[#2a2622]'
            }`}
          >
            HOME
          </Link>

          <Link
            href="/articles"
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border-2 transition-all ${
              pathname.startsWith('/articles')
                ? 'bg-[#FF8A3D] text-black border-black shadow-neo-sm'
                : 'bg-transparent text-black dark:text-white border-transparent hover:border-black hover:bg-[#fff9ef] dark:hover:bg-[#2a2622]'
            }`}
          >
            ARTICLES & ARCHIVE
          </Link>

          <Link
            href="/about"
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border-2 transition-all ${
              pathname === '/about'
                ? 'bg-[#FF8A3D] text-black border-black shadow-neo-sm'
                : 'bg-transparent text-black dark:text-white border-transparent hover:border-black hover:bg-[#fff9ef] dark:hover:bg-[#2a2622]'
            }`}
          >
            ABOUT & MANIFESTO
          </Link>
        </nav>

        {/* Zone 3: Actions & Search */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Search Intel Trigger Button */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 bg-[#FAF4EB] dark:bg-[#2a2622] hover:bg-white text-black dark:text-white px-3 py-1.5 rounded-md border-2 border-black shadow-neo-sm hover:shadow-neo transition-all text-xs font-mono-code font-bold cursor-pointer"
            title="Search dispatches or ask AI Intel"
          >
            <Search className="w-4 h-4 text-black dark:text-white" />
            <span>SEARCH INTEL...</span>
            <kbd className="bg-[#FFE600] text-black px-1.5 py-0.5 rounded border border-black text-[10px] font-bold">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 bg-[#FAF4EB] dark:bg-[#2a2622] border-2 border-black shadow-neo-sm rounded-md text-black dark:text-white"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 bg-[#4DEEEA] text-black border-2 border-black shadow-neo-sm hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 rounded-md transition-all cursor-pointer"
            title={isDarkMode ? 'Switch to Light Newsprint' : 'Switch to Dark Cyberpunk'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Stamp */}
          <button 
            onClick={onOpenSearch}
            className="p-2 bg-[#FF6B97] text-black border-2 border-black shadow-neo-sm hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 rounded-md transition-all cursor-pointer"
            title="User Profile & Saved Dispatches"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 bg-[#FFE600] text-black border-2 border-black shadow-neo-sm rounded-md font-bold text-xs"
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF4EB] dark:bg-[#1e1b18] border-t-2 border-black p-4 flex flex-col gap-3 font-display">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2.5 font-black text-sm bg-[#FF8A3D] text-black border-2 border-black shadow-neo-sm rounded"
          >
            ⚡ HOME
          </Link>
          <Link
            href="/articles"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2.5 font-black text-sm bg-[#4DEEEA] text-black border-2 border-black shadow-neo-sm rounded"
          >
            📁 ARTICLES & ARCHIVE
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2.5 font-black text-sm bg-[#FF6B97] text-black border-2 border-black shadow-neo-sm rounded"
          >
            🔥 ABOUT & MANIFESTO
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSearch();
            }}
            className="p-2.5 font-black text-sm bg-[#FFE600] text-black border-2 border-black shadow-neo-sm rounded text-left flex items-center justify-between"
          >
            <span>🔍 SEARCH INTEL (AI ASSISTANT)</span>
            <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded">GEMINI</span>
          </button>
        </div>
      )}
    </header>
  );
}
