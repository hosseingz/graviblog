'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Radio } from 'lucide-react';
import { Post } from '@/lib/posts';

interface HeroDispatchProps {
  post: Post;
}

export default function HeroDispatch({ post }: HeroDispatchProps) {
  return (
    <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg shadow-neo-lg p-5 sm:p-7 relative overflow-hidden group">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between border-b-3 border-black pb-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="bg-[#FF8A3D] text-black border-2 border-black font-display font-black text-xs px-3 py-1 rounded shadow-neo-sm flex items-center gap-1.5 uppercase tracking-wide">
            ★ COVER DISPATCH
          </span>
          <span className="bg-[#FFE600] text-black border-2 border-black font-mono-code text-[11px] font-bold px-2 py-0.5 rounded hidden sm:inline-block">
            {post.issueNumber || 'ISSUE NO. 084'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono-code font-bold text-black dark:text-white">
          <Radio className="w-3.5 h-3.5 text-[#FF6B97] animate-pulse" />
          <span className="hidden sm:inline">LIVE TRANSMISSION</span>
        </div>
      </div>

      {/* Main Cover Image Frame */}
      <div className="relative w-full aspect-[16/9] bg-[#dfd9d1] border-4 border-black rounded-md overflow-hidden shadow-neo mb-6 group-hover:shadow-neo-lg transition-all">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 800px"
          referrerPolicy="no-referrer"
          className="object-cover group-hover:scale-102 transition-transform duration-300"
        />
        
        {/* Category tag overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-1 rounded shadow-neo-sm">
            HARDWARE INVESTIGATION
          </span>
          <span className="bg-black text-white font-mono-code text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" /> {post.readTime}
          </span>
        </div>
      </div>

      {/* Author & Timestamp bar */}
      <div className="flex items-center gap-2 text-xs font-mono-code font-bold text-gray-700 dark:text-gray-300 mb-3">
        <span>BY {post.author.name}</span>
        <span>·</span>
        <span>{post.publishDate}</span>
        <span>·</span>
        <span>{post.bookmarks} TRANSMISSIONS</span>
      </div>

      {/* Title */}
      <Link href={`/articles/${post.slug}`}>
        <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none text-black dark:text-white group-hover:text-[#FF8A3D] transition-colors mb-4 uppercase">
          {post.title}
        </h2>
      </Link>

      {/* Excerpt */}
      <p className="font-sans font-medium text-gray-800 dark:text-gray-200 text-base sm:text-lg leading-relaxed mb-6 max-w-3xl">
        {post.excerpt}
      </p>

      {/* Tags and CTA Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-3 border-black">
        <div className="flex flex-wrap items-center gap-2">
          {post.tags.map((tag, idx) => (
            <span
              key={idx}
              className="bg-[#fff9ef] dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-[11px] font-bold px-2.5 py-1 rounded shadow-neo-sm"
            >
              #{tag.toUpperCase()}
            </span>
          ))}
        </div>

        <Link
          href={`/articles/${post.slug}`}
          className="bg-[#FF6B97] hover:bg-[#ff5285] text-black border-3 border-black font-display font-black text-sm px-6 py-3 rounded shadow-neo hover:shadow-neo-lg active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 uppercase shrink-0"
        >
          <span>READ FULL ESSAY</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </Link>
      </div>
    </div>
  );
}
