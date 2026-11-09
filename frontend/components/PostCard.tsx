'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock, Bookmark } from 'lucide-react';
import { Post } from '@/lib/posts';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg shadow-neo hover:shadow-neo-lg transition-all flex flex-col justify-between group overflow-hidden">
      <div>
        {/* Thumbnail Image Container */}
        <div className="relative w-full aspect-[16/10] bg-[#dfd9d1] border-b-3 border-black overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-103 transition-transform duration-300"
          />

          {/* Category Tag Overlay */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className={`font-mono-code font-black text-[10px] px-2 py-0.5 rounded border border-black shadow-neo-sm ${post.categoryColor}`}>
              {post.category}
            </span>
          </div>

          <button 
            className="absolute top-2.5 right-2.5 p-1.5 bg-white text-black border border-black rounded shadow-neo-sm hover:bg-[#FFE600] transition-colors cursor-pointer"
            title="Bookmark Dispatch"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Content Area */}
        <div className="p-4 sm:p-5">
          {/* Metadata */}
          <div className="flex items-center justify-between text-[11px] font-mono-code text-gray-600 dark:text-gray-400 font-bold mb-2">
            <span>{post.publishDate}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-black dark:text-white" />
              {post.readTime}
            </span>
          </div>

          {/* Title */}
          <Link href={`/articles/${post.slug}`}>
            <h3 className="font-display font-black text-lg sm:text-xl text-black dark:text-white group-hover:text-[#FF8A3D] transition-colors uppercase leading-tight mb-2 line-clamp-2">
              {post.title}
            </h3>
          </Link>

          {/* Excerpt */}
          <p className="font-sans font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed mb-4">
            {post.excerpt}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t-2 border-black/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#FF8A3D] text-black border border-black flex items-center justify-center font-mono-code text-[10px] font-black shrink-0">
            {post.author.avatar}
          </div>
          <span className="font-mono-code text-[11px] font-bold text-black dark:text-white truncate max-w-[120px]">
            {post.author.name}
          </span>
        </div>

        <Link
          href={`/articles/${post.slug}`}
          className="bg-white dark:bg-[#2a2622] group-hover:bg-[#4DEEEA] text-black border-2 border-black font-display font-black text-xs px-3 py-1 rounded shadow-neo-sm group-hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 uppercase shrink-0"
        >
          <span>READ</span>
          <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
        </Link>
      </div>
    </article>
  );
}
