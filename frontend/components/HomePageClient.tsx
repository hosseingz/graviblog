'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroDispatch from '@/components/HeroDispatch';
import HotTakeDeck from '@/components/HotTakeDeck';
import CartridgeOfWeek from '@/components/CartridgeOfWeek';
import PostCard from '@/components/PostCard';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import { Sparkles, ShieldAlert, ChevronDown, Cpu, Terminal } from 'lucide-react';
import Link from 'next/link';

interface Post {
  slug: string;
  category: { slug: string; name: string };
  title: string;
  excerpt: string;
  author: { name: string; avatar: string };
  publish_date: string;
  likes_count: number;
  bookmarks_count: number;
  cover_image: string;
  tags: string[] | string;
  read_time: string;
  categoryColor?: string;
}

interface Props {
  initialPosts: Post[];
}

export default function HomePageClient({ initialPosts }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Format posts to match the existing UI component requirements
  const formattedPosts = initialPosts.map((post) => ({
    ...post,
    categoryColor: 'text-[#FF8A3D] border-[#FF8A3D]', // Add dynamic category color if needed
    category: post.category.name.toUpperCase(),
    publishDate: new Date(post.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    readTime: post.read_time || '5 MIN READ',
    author: { name: post.author.name, avatar: post.author.name.charAt(0) },
    likes: post.likes_count,
    bookmarks: post.bookmarks_count,
    coverImage: post.cover_image || 'https://picsum.photos/seed/placeholder/800/400',
    tags: Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',') : []),
  }));

  const coverPost = formattedPosts.length > 0 ? formattedPosts[0] : null;

  const filteredPosts = formattedPosts.filter((post) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'TECH') return post.category === 'TECH' || post.category === 'HARDWARE';
    if (selectedCategory === 'GAMING') return post.category === 'GAMING' || post.category === 'CRITIQUE';
    if (selectedCategory === 'RETRO') return post.category === 'RETRO' || post.category === 'INDIE';
    if (selectedCategory === 'DEV') return post.category === 'DEV LOG' || post.category === 'SYNTHESIS' || post.category === 'SOUNDTRACKS';
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'popular') return b.likes - a.likes;
    return 0; // default original order (assume sorted from backend)
  });

  const displayedPosts = sortedPosts.slice(0, visibleCount);

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7]">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12">
        {/* Top Issue Headline Banner */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-5 sm:p-7 shadow-neo relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
                ISSUE NO. 084 // FALL EDIT
              </span>
              <span className="bg-[#FF6B97] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm hidden sm:inline-block">
                100% UNAPOLOGETIC
              </span>
            </div>

            <span className="bg-[#4DEEEA] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
              HAVE A RAD DAY v2.4
            </span>
          </div>

          <div className="relative">
            <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tight text-black dark:text-white leading-[0.95]">
              UNAPOLOGETIC GAMING &amp; DISPATCHES
            </h1>

            {/* Sticker Badges floating */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="bg-[#FF6B97] text-black border-3 border-black font-display font-black text-xs sm:text-sm px-3 py-1 rounded-full shadow-neo-sm transform -rotate-1">
                LET&apos;S GO! ⚡
              </span>
              <span className="bg-[#4DEEEA] text-black border-3 border-black font-display font-black text-xs sm:text-sm px-3 py-1 rounded-full shadow-neo-sm transform rotate-2">
                OMG! 🔥
              </span>
              <p className="font-sans font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300 max-w-2xl">
                Zero corporate review copies. Zero embargo fluff. Raw underground dispatches on weird indie engines, handheld micro-hardware, and arcade renaissance culture.
              </p>
            </div>
          </div>

          {/* Quick Category Quicklinks Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t-3 border-black">
            <Link
              href="/articles?cat=HARDWARE"
              className="bg-[#fff9ef] dark:bg-[#2a2622] hover:bg-[#FF8A3D] hover:text-black text-black dark:text-white border-2 border-black p-2.5 rounded shadow-neo-sm transition-all font-mono-code text-xs font-bold flex items-center gap-2 truncate"
            >
              <Cpu className="w-4 h-4 text-[#FF8A3D] shrink-0" />
              <span className="truncate">HARDWARE LAB: DIY Cyberdecks</span>
            </Link>

            <Link
              href="/articles?cat=RETRO"
              className="bg-[#fff9ef] dark:bg-[#2a2622] hover:bg-[#4DEEEA] hover:text-black text-black dark:text-white border-2 border-black p-2.5 rounded shadow-neo-sm transition-all font-mono-code text-xs font-bold flex items-center gap-2 truncate"
            >
              <Terminal className="w-4 h-4 text-[#4DEEEA] shrink-0" />
              <span className="truncate">RETRO SHOCK: CRT Phosphor Love</span>
            </Link>

            <Link
              href="/articles?cat=DEV"
              className="bg-[#fff9ef] dark:bg-[#2a2622] hover:bg-[#FF6B97] hover:text-white text-black dark:text-white border-2 border-black p-2.5 rounded shadow-neo-sm transition-all font-mono-code text-xs font-bold flex items-center gap-2 truncate"
            >
              <Sparkles className="w-4 h-4 text-[#FF6B97] shrink-0" />
              <span className="truncate">INDIE CODE: Custom C++ Engines</span>
            </Link>

            <Link
              href="/about"
              className="bg-[#fff9ef] dark:bg-[#2a2622] hover:bg-[#FFE600] hover:text-black text-black dark:text-white border-2 border-black p-2.5 rounded shadow-neo-sm transition-all font-mono-code text-xs font-bold flex items-center gap-2 truncate"
            >
              <ShieldAlert className="w-4 h-4 text-[#FFE600] shrink-0" />
              <span className="truncate">MANIFESTO: Kill The DRM</span>
            </Link>
          </div>
        </div>

        {/* Hero Dispatch + Right Column Widgets */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Cover Dispatch (8 Cols) */}
          <div className="lg:col-span-8">
            {coverPost && <HeroDispatch post={coverPost as any} />}
          </div>

          {/* Right Side Widgets (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <HotTakeDeck />
            <CartridgeOfWeek />
          </div>
        </section>

        {/* Index Transmissions Category Filter Bar */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
            <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight">
              ARCHIVE TRANSMISSIONS
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {['ALL', 'TECH', 'GAMING', 'RETRO', 'DEV'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-mono-code font-bold text-xs px-3 py-1.5 rounded-full border-2 border-black transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-neo-sm'
                      : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white border-transparent hover:border-black dark:hover:border-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Filter / Sort bar */}
          <div className="flex items-center justify-between text-sm font-mono-code font-bold text-gray-500">
            <span>SHOWING {displayedPosts.length} OF {sortedPosts.length} LOGS</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSortBy('latest')}
                className={`hover:text-black dark:hover:text-white transition-colors uppercase ${sortBy === 'latest' ? 'text-black dark:text-white' : ''}`}
              >
                LATEST
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`hover:text-[#FF8A3D] transition-colors uppercase ${sortBy === 'popular' ? 'text-[#FF8A3D]' : ''}`}
              >
                MOST FIRE
              </button>
            </div>
          </div>

          {/* Post Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedPosts.map((post) => (
              <PostCard key={post.slug} post={post as any} />
            ))}
          </div>

          {/* Load More Button */}
          {visibleCount < sortedPosts.length && (
            <div className="pt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="bg-[#FAF4EB] dark:bg-[#2a2622] hover:bg-[#FF8A3D] text-black dark:text-white hover:text-black border-4 border-black font-display font-black text-sm px-8 py-3.5 rounded-lg shadow-neo hover:shadow-neo-lg active:translate-x-0.5 active:translate-y-0.5 transition-all inline-flex items-center gap-2 uppercase cursor-pointer"
              >
                <span>LOAD ARCHIVE DISPATCHES ({sortedPosts.length - visibleCount} MORE)</span>
                <ChevronDown className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          )}
        </section>

        {/* Editorial Creed Banner */}
        <section className="bg-[#FF8A3D] border-4 border-black rounded-lg p-6 sm:p-10 shadow-neo-lg relative overflow-hidden">
          <div className="max-w-4xl">
            <div className="inline-block bg-black text-white font-mono-code text-[11px] font-bold px-3 py-1 rounded mb-3">
              ★ THE PIXEL PUNCH CREED
            </div>

            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase text-black tracking-tight leading-tight mb-3">
              WE DON&apos;T WRITE PRESS RELEASES. WE WRITE TRUTH.
            </h2>

            <p className="font-sans font-medium text-black text-base sm:text-lg leading-relaxed mb-6">
              Pixel Punch is funded purely by readers, zine subscribers, and community donations. No affiliate kickbacks, no sponsored game ratings, and no publisher embargo gag orders.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/about"
                className="bg-white hover:bg-black hover:text-white text-black border-3 border-black font-display font-black text-xs sm:text-sm px-6 py-3 rounded-md shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase"
              >
                READ OUR EDITORIAL CODE
              </Link>
              <Link
                href="/about#donate"
                className="bg-[#FF6B97] hover:bg-[#ff5285] text-black border-3 border-black font-display font-black text-xs sm:text-sm px-6 py-3 rounded-md shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase"
              >
                SUPPORT INDIE PRESS ★
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Global AI Search Intel Modal */}
      <SearchDrawerModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
