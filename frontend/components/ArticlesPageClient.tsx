'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Filter, Search, ChevronLeft, ChevronRight, Layers, Database } from 'lucide-react';

interface Category {
  slug: string;
  name: string;
  count: number;
}

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
  initialCategories: Category[];
  initialPosts: Post[];
}

export default function ArticlesPageClient({ initialCategories, initialPosts }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 9;

  // Format posts
  const formattedPosts = initialPosts.map((post) => ({
    ...post,
    categoryColor: 'text-[#FF8A3D] border-[#FF8A3D]',
    category: post.category.name.toUpperCase(),
    publishDate: new Date(post.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    readTime: post.read_time || '5 MIN READ',
    author: { name: post.author.name, avatar: post.author.name.charAt(0) },
    likes: post.likes_count,
    bookmarks: post.bookmarks_count,
    coverImage: post.cover_image || 'https://picsum.photos/seed/placeholder/800/400',
    tags: Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',') : []),
  }));

  // Filter posts
  const filteredPosts = useMemo(() => {
    return formattedPosts.filter((post) => {
      const matchCat =
        activeCategory === 'ALL' ||
        post.category.toUpperCase() === activeCategory.toUpperCase();
      const matchQuery =
        !searchQuery.trim() ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery, formattedPosts]);

  // Sort posts
  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts];
    if (sortOrder === 'popular') {
      sorted.sort((a, b) => b.likes - a.likes);
    }
    // "latest" is already handled by backend default order
    return sorted;
  }, [filteredPosts, sortOrder]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / postsPerPage));
  // Ensure current page is valid when filters change
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  // Derive categories dynamically from data instead of hardcoded
  // Backend provides actual categories, but we need an 'ALL' at the beginning
  const categories = [{ name: 'ALL', count: formattedPosts.length }, ...initialCategories];

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7]">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">

        {/* Page Header */}
        <section className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-10 shadow-neo relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-black text-white font-mono-code text-xs font-black px-2.5 py-1 rounded">
              DATABASE
            </span>
            <span className="font-mono-code text-xs font-bold text-gray-500">
              {formattedPosts.length} LOGS ONLINE
            </span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tight leading-none mb-4">
            THE <span className="text-[#FF8A3D]">ARCHIVE</span>
          </h1>
          <p className="font-sans font-medium text-base sm:text-lg max-w-2xl text-gray-700 dark:text-gray-300">
            Unrestricted access to the complete Pixel Punch mainframe. Sort, filter, and extract raw intel across hardware tear-downs, indie dev logs, and retro restorations.
          </p>

          <div className="absolute -right-10 -bottom-10 opacity-10 dark:opacity-5 hidden md:block">
            <Database className="w-64 h-64" />
          </div>
        </section>

        {/* Master Controls Section */}
        <section className="bg-white dark:bg-[#2a2622] border-3 border-black rounded-lg p-4 sm:p-5 shadow-neo-sm flex flex-col md:flex-row gap-5 items-center justify-between sticky top-4 z-10">

          {/* Search Bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="SEARCH THE MAINFRAME..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF4EB] dark:bg-[#1e1b18] border-2 border-black rounded font-mono-code text-xs font-bold py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A3D] text-black dark:text-white uppercase placeholder-gray-500"
            />
          </div>

          {/* Dynamic Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto w-full hide-scrollbar pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setActiveCategory(cat.name);
                  setCurrentPage(1);
                }}
                className={`font-mono-code font-bold text-[11px] px-3 py-1.5 rounded-full border-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeCategory === cat.name
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-neo-sm'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                   activeCategory === cat.name ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-200 dark:bg-gray-800'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort Toggles */}
          <div className="flex items-center gap-1 shrink-0 bg-[#FAF4EB] dark:bg-[#1e1b18] p-1 border-2 border-black rounded">
            <button
              onClick={() => setSortOrder('latest')}
              className={`font-mono-code text-[10px] font-bold px-3 py-1.5 rounded uppercase transition-colors ${
                sortOrder === 'latest' ? 'bg-black text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'
              }`}
            >
              LATEST
            </button>
            <button
              onClick={() => setSortOrder('popular')}
              className={`font-mono-code text-[10px] font-bold px-3 py-1.5 rounded uppercase transition-colors ${
                sortOrder === 'popular' ? 'bg-[#FF8A3D] text-black' : 'text-gray-500 hover:text-[#FF8A3D]'
              }`}
            >
              POPULAR
            </button>
          </div>
        </section>

        {/* Results Info */}
        <div className="flex items-center justify-between font-mono-code text-xs font-bold text-gray-500 px-1">
          <span>
            SHOWING {paginatedPosts.length} OF {sortedPosts.length} LOGS
          </span>
          {searchQuery && (
            <span className="text-[#FF8A3D]">FILTERED BY SEARCH</span>
          )}
        </div>

        {/* Post Grid */}
        {paginatedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {paginatedPosts.map((post) => (
              <PostCard key={post.slug} post={post as any} />
            ))}
          </div>
        ) : (
          <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-dashed border-gray-400 dark:border-gray-700 rounded-lg p-12 text-center flex flex-col items-center justify-center">
            <Layers className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="font-display font-black text-2xl uppercase mb-2">NO RECORDS FOUND</h3>
            <p className="font-mono-code text-sm text-gray-500 max-w-md">
              The mainframe returned zero hits for your current filter parameters. Try adjusting your search term or clearing active category filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
              }}
              className="mt-6 bg-black text-white font-mono-code text-xs font-bold px-4 py-2 rounded border-2 border-black hover:bg-white hover:text-black transition-colors"
            >
              RESET FILTERS
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-8 border-t-4 border-black mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border-2 border-black rounded bg-white dark:bg-[#2a2622] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FF8A3D] transition-colors shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
            >
              <ChevronLeft className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="font-mono-code text-sm font-black flex items-center gap-2">
              PAGE <span className="bg-black text-white px-2 py-0.5 rounded">{currentPage}</span> OF {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border-2 border-black rounded bg-white dark:bg-[#2a2622] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FF8A3D] transition-colors shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
            >
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        )}

      </main>

      <Footer />

      {/* Global AI Search Intel Modal */}
      <SearchDrawerModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
