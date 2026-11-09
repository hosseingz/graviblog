'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import { POSTS, Post } from '@/lib/posts';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Filter, Search, ChevronLeft, ChevronRight, Layers, Database } from 'lucide-react';

export default function ArticlesPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 9;

  // Filter posts
  const filteredPosts = useMemo(() => {
    return POSTS.filter((post) => {
      const matchCat =
        activeCategory === 'ALL' ||
        post.category.toUpperCase() === activeCategory.toUpperCase();
      const matchQuery =
        !searchQuery.trim() ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchQuery;
    }).sort((a, b) => {
      if (sortOrder === 'popular') return b.likes - a.likes;
      return 0;
    });
  }, [activeCategory, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  const featuredCoverStory = POSTS.find(p => p.slug === 'death-of-physical-media-pirate-archivists-cart-rays') || POSTS[2];

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7]">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Page Masthead Header Banner matching post_list_48b6b8fa.png */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#FF6B97] text-white font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
                ★ 128 ESSAYS FILED
              </span>
              <span className="bg-[#4DEEEA] text-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
                NO CLICKBAIT
              </span>
              <span className="bg-[#FFE600] text-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm hidden sm:inline-block">
                100% PURE INK
              </span>
            </div>

            {/* Database stamp */}
            <div className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>DATABASE VERSION v4.09 VERIFIED LO-FI</span>
            </div>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tight text-black dark:text-white leading-none">
            ALL DISPATCHES & ARCHIVE
          </h1>

          <p className="font-sans font-medium text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-2 max-w-3xl">
            Unfiltered underground gaming dispatches, hardware tear-downs, design manifestos, and retro cabinet forensics. Fresh ink stamped daily.
          </p>

          {/* Category Filter Pills & Controls Bar */}
          <div className="mt-6 pt-5 border-t-3 border-black flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'ALL (128)', val: 'ALL' },
                { label: 'GAMING (46)', val: 'GAMING' },
                { label: 'TECH (34)', val: 'TECH' },
                { label: 'HARDWARE (19)', val: 'HARDWARE' },
                { label: 'RETRO (18)', val: 'RETRO' },
                { label: 'CRITIQUE (11)', val: 'CRITIQUE' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  onClick={() => {
                    setActiveCategory(btn.val);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-mono-code font-bold rounded-md border-2 transition-all cursor-pointer ${
                    activeCategory === btn.val
                      ? 'bg-[#FF8A3D] text-black border-black shadow-neo-sm'
                      : 'bg-white dark:bg-[#2a2622] text-black dark:text-white border-black hover:bg-[#FFE600] hover:text-black'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Sort & Search filter inputs */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative flex-1 sm:w-56">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter dispatches..."
                  className="w-full bg-white dark:bg-[#2a2622] border-2 border-black p-1.5 pl-7 text-xs font-mono-code text-black dark:text-white rounded shadow-neo-sm focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2.5" />
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-white dark:bg-[#2a2622] text-black dark:text-white border-2 border-black text-xs font-mono-code font-bold p-1.5 rounded shadow-neo-sm cursor-pointer"
              >
                <option value="latest">SORT: LATEST DROPS ∨</option>
                <option value="popular">SORT: MOST READ ⚡</option>
              </select>
            </div>
          </div>
        </div>

        {/* Featured Cover Story Banner */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-5 sm:p-7 shadow-neo-lg grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 relative aspect-[16/10] bg-black border-3 border-black rounded overflow-hidden shadow-neo">
            <Image
              src={featuredCoverStory.coverImage}
              alt={featuredCoverStory.title}
              fill
              sizes="(max-width: 1000px) 100vw, 500px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
            <div className="absolute top-2 left-2 bg-[#FF6B97] text-white border border-black text-[10px] font-mono-code font-black px-2 py-0.5 rounded shadow-neo-sm">
              COVER STORY ★ ISSUE #84
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-code font-bold text-gray-600 dark:text-gray-400 mb-1">
                <span>GAMING INVESTIGATION</span>
                <span>·</span>
                <span>OCTOBER 24, 2025</span>
              </div>

              <h2 className="font-display font-black text-2xl sm:text-4xl text-black dark:text-white uppercase leading-tight">
                {featuredCoverStory.title}
              </h2>

              <p className="font-sans font-medium text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                {featuredCoverStory.excerpt}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-black/20">
              <div className="flex items-center gap-2 font-mono-code text-xs font-bold text-black dark:text-white">
                <div className="w-6 h-6 rounded bg-[#FF8A3D] border border-black flex items-center justify-center font-black">
                  RV
                </div>
                <span>ROCCO VALENTINE (CHIEF CRT CORRESPONDENT)</span>
              </div>

              <Link
                href={`/articles/${featuredCoverStory.slug}`}
                className="bg-[#FF8A3D] hover:bg-[#ff7724] text-black border-3 border-black font-display font-black text-xs px-5 py-2.5 rounded shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 uppercase"
              >
                <span>READ COVER STORY</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main Dispatches Grid Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b-3 border-black pb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#70E000] border border-black animate-pulse" />
              <h3 className="font-display font-black text-2xl uppercase tracking-tight text-black dark:text-white">
                LATEST RELEASES & FIELD NOTES
              </h3>
            </div>
            <span className="font-mono-code text-xs font-bold text-gray-500">
              FEED LIVE // NO EMBARGOES
            </span>
          </div>

          {paginatedPosts.length === 0 ? (
            <div className="p-12 text-center bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg font-mono-code text-sm">
              NO DISPATCHES FOUND IN CATEGORY &quot;{activeCategory}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination Controls matching mockup [Prev 1 2 3 4 ... 12 Next] */}
          <div className="pt-6 border-t-3 border-black flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-[#FAF4EB] dark:bg-[#2a2622] disabled:opacity-50 text-black dark:text-white border-3 border-black font-mono-code font-black text-xs px-4 py-2 rounded shadow-neo-sm hover:bg-[#FFE600] hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>PREV</span>
            </button>

            <div className="flex items-center gap-1.5 font-mono-code text-xs font-black">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-8 h-8 rounded border-2 border-black flex items-center justify-center transition-all cursor-pointer ${
                    currentPage === num
                      ? 'bg-[#FF8A3D] text-black shadow-neo-sm font-black'
                      : 'bg-white dark:bg-[#2a2622] text-black dark:text-white hover:bg-[#4DEEEA] hover:text-black'
                  }`}
                >
                  {num}
                </button>
              ))}
              <span className="px-1 text-gray-500">...</span>
              <button
                onClick={() => setCurrentPage(12)}
                className="w-8 h-8 rounded border-2 border-black bg-white dark:bg-[#2a2622] text-black dark:text-white flex items-center justify-center hover:bg-[#4DEEEA] hover:text-black cursor-pointer"
              >
                12
              </button>
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(12, p + 1))}
              className="bg-[#4DEEEA] hover:bg-[#30dcd8] text-black border-3 border-black font-mono-code font-black text-xs px-4 py-2 rounded shadow-neo-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>NEXT</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
      <SearchDrawerModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
