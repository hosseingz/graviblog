'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import AISummarizerModal from '@/components/AISummarizerModal';
import PostCard from '@/components/PostCard';
import apiClient from '@/lib/api/apiClient';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Bookmark,
  Share2,
  Sparkles,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  Zap,
  Cpu,
} from 'lucide-react';

interface Author {
  name: string;
  avatar: string;
}

interface Category {
  name: string;
  slug: string;
}

interface Comment {
  id: string | number;
  author: string;
  avatar: string;
  content: string;
  timeAgo: string;
  upvotes: number;
  editorialReply?: {
    author: string;
    content: string;
  };
}

interface PostData {
  slug: string;
  category: Category;
  title: string;
  content: string;
  content_markdown: string;
  excerpt: string;
  author: Author;
  publish_date: string;
  likes_count: number;
  bookmarks_count: number;
  cover_image: string;
  tags: string;
  read_time: string;
  comments?: Comment[];
}

interface Props {
  initialPost: PostData;
  relatedPosts: any[];
}

export default function ArticleDetailPageClient({ initialPost, relatedPosts }: Props) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);

  // Format the post data to match the UI component expectations
  const post = {
    ...initialPost,
    category: initialPost.category.name.toUpperCase(),
    publishDate: new Date(initialPost.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    readTime: initialPost.read_time || '5 MIN READ',
    author: { name: initialPost.author.name, avatar: initialPost.author.name.charAt(0) },
    likes: initialPost.likes_count,
    bookmarks: initialPost.bookmarks_count,
    coverImage: initialPost.cover_image || 'https://picsum.photos/seed/placeholder/800/400',
    tags: initialPost.tags ? initialPost.tags.split(',') : [],
    contentHtml: initialPost.content_markdown || initialPost.content || '<p>No content available.</p>',
    comments: initialPost.comments || []
  };

  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);

  const [hasBookmarked, setHasBookmarked] = useState(false);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarks);

  const formattedRelatedPosts = relatedPosts.map((p) => ({
    ...p,
    categoryColor: 'text-[#FF8A3D] border-[#FF8A3D]',
    category: p.category.name.toUpperCase(),
    publishDate: new Date(p.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    readTime: p.read_time || '5 MIN READ',
    author: { name: p.author.name, avatar: p.author.name.charAt(0) },
    likes: p.likes_count,
    bookmarks: p.bookmarks_count,
    coverImage: p.cover_image || 'https://picsum.photos/seed/placeholder/800/400',
    tags: p.tags ? p.tags.split(',') : [],
  }));

  const handleLike = async () => {
    try {
      const response = await apiClient.post(`/api/v1/posts/${post.slug}/like/`);
      setLikesCount(response.data.likes);
      setHasLiked(response.data.has_liked);
    } catch (error) {
      console.error('Failed to toggle like', error);
      // Optional: Add a toast notification here
    }
  };

  const handleBookmark = async () => {
    try {
      const response = await apiClient.post(`/api/v1/posts/${post.slug}/bookmark/`);
      setBookmarksCount(response.data.bookmarks);
      setHasBookmarked(response.data.bookmarked);
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
      // Optional: Add a toast notification here
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7] selection:bg-[#FF8A3D] selection:text-black">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 w-full flex flex-col">
        {/* Full-width Hero Cover */}
        <div className="w-full relative h-[45vh] sm:h-[60vh] bg-black border-b-8 border-black overflow-hidden group">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          />
          {/* Scanline overlay for that retro feel */}
          <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

          {/* Floating Category Tag */}
          <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10 flex gap-3 items-center">
            <span className="bg-[#4DEEEA] text-black border-4 border-black font-display font-black text-sm sm:text-base px-4 py-1 rounded shadow-neo-sm transform -rotate-2">
              {post.category}
            </span>
          </div>

          <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-10 flex gap-3">
            <button
              onClick={() => setAiSummaryOpen(true)}
              className="bg-[#FFE600] hover:bg-white text-black border-3 border-black p-3 rounded-full shadow-neo active:translate-y-1 transition-all group/btn"
              title="Generate AI Summary"
            >
              <Sparkles className="w-6 h-6 stroke-[2.5] group-hover/btn:animate-spin" />
            </button>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Main Article Body (8 cols) */}
          <article className="lg:col-span-8 space-y-8">

            <header className="space-y-6 pb-8 border-b-4 border-black">
              <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tighter leading-[0.9] text-black dark:text-white">
                {post.title}
              </h1>

              <p className="font-sans font-medium text-xl sm:text-2xl text-gray-700 dark:text-gray-300 leading-snug border-l-4 border-[#FF6B97] pl-4">
                {post.excerpt}
              </p>

              {/* Author & Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF4EB] dark:bg-[#1e1b18] border-2 border-black p-3 rounded shadow-neo-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF8A3D] border-2 border-black flex items-center justify-center font-display text-xl font-black text-black">
                    {post.author.avatar}
                  </div>
                  <div>
                    <div className="font-mono-code font-bold text-sm leading-none flex items-center gap-2">
                      {post.author.name}
                      <CheckCircle className="w-3.5 h-3.5 text-[#4DEEEA]" />
                    </div>
                    <div className="font-mono-code text-xs text-gray-500 mt-1">
                      {post.publishDate} • {post.readTime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 border-2 border-black px-3 py-1.5 rounded font-mono-code text-xs font-bold transition-all shadow-neo-sm active:translate-y-0.5 ${
                      hasLiked
                        ? 'bg-[#FF6B97] text-white'
                        : 'bg-white dark:bg-[#2a2622] hover:bg-[#FF6B97] hover:text-white text-black dark:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                    {likesCount}
                  </button>
                  <button
                    onClick={handleBookmark}
                    className={`flex items-center gap-2 border-2 border-black px-3 py-1.5 rounded font-mono-code text-xs font-bold transition-all shadow-neo-sm active:translate-y-0.5 ${
                      hasBookmarked
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-white dark:bg-[#2a2622] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${hasBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </header>

            {/* Prose Content Container */}
            {/* The 'prose' classes come from @tailwindcss/typography (assumed installed based on package.json) */}
            <div
              className="prose prose-lg dark:prose-invert prose-headings:font-display prose-headings:font-black prose-headings:uppercase prose-p:font-sans prose-p:font-medium prose-a:text-[#FF8A3D] hover:prose-a:text-[#FF6B97] prose-img:border-4 prose-img:border-black prose-img:rounded-md max-w-none"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            {/* Tags Footer */}
            <div className="pt-8 flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/articles?search=${tag}`}
                  className="bg-[#fff9ef] dark:bg-[#2a2622] border-2 border-black font-mono-code text-[11px] font-bold px-3 py-1 rounded hover:bg-[#4DEEEA] hover:text-black transition-colors uppercase shadow-neo-sm"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            {/* Share & Support Banner */}
            <div className="mt-12 bg-[#FF8A3D] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg text-black relative overflow-hidden">
              <Zap className="absolute -right-6 -bottom-6 w-32 h-32 opacity-20" />
              <h3 className="font-display font-black text-3xl uppercase mb-2">END OF TRANSMISSION</h3>
              <p className="font-sans font-semibold mb-6 max-w-md">
                If this intel was valuable, share it on the wire. We rely on reader support to keep the mainframe running without corporate ads.
              </p>
              <div className="flex items-center gap-3">
                <button className="bg-white hover:bg-black hover:text-white border-2 border-black font-display font-black text-sm px-6 py-2.5 rounded shadow-neo active:translate-y-0.5 transition-all flex items-center gap-2 uppercase">
                  <Share2 className="w-4 h-4 stroke-[3]" />
                  COPY LINK
                </button>
                <Link href="/about#donate" className="bg-[#FF6B97] hover:bg-[#ff5285] border-2 border-black font-display font-black text-sm px-6 py-2.5 rounded shadow-neo active:translate-y-0.5 transition-all flex items-center gap-2 uppercase">
                  <Heart className="w-4 h-4 stroke-[3] fill-current" />
                  SUPPORT US
                </Link>
              </div>
            </div>

          </article>

          {/* Right Sidebar (4 cols) */}
          <aside className="lg:col-span-4 space-y-8">

            {/* Intel Sidebar Widget */}
            <div className="bg-white dark:bg-[#1e1b18] border-4 border-black rounded p-5 shadow-neo">
              <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-4">
                <Cpu className="w-5 h-5 text-[#4DEEEA]" />
                <h3 className="font-display font-black text-xl uppercase tracking-tight">System Intel</h3>
              </div>
              <ul className="space-y-4 font-mono-code text-xs font-bold text-gray-700 dark:text-gray-300">
                <li className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span>LOG ID</span>
                  <span className="text-black dark:text-white">#{post.slug.substring(0,6).toUpperCase()}</span>
                </li>
                <li className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span>ENCRYPTION</span>
                  <span className="text-[#FF8A3D]">NONE (PUBLIC)</span>
                </li>
                <li className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span>PING</span>
                  <span className="text-black dark:text-white">14ms</span>
                </li>
                <li className="flex justify-between">
                  <span>ENGAGEMENT</span>
                  <span className="text-[#FF6B97]">HIGH LEVEL</span>
                </li>
              </ul>
            </div>

            {/* Related Logs / More from Author */}
            {formattedRelatedPosts.length > 0 && (
              <div>
                <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-4 border-b-4 border-black pb-2">
                  RELATED LOGS
                </h3>
                <div className="space-y-4">
                  {formattedRelatedPosts.map((relatedPost) => (
                    <Link href={`/articles/${relatedPost.slug}`} key={relatedPost.slug} className="block group">
                      <div className="bg-[#FAF4EB] dark:bg-[#2a2622] border-2 border-black rounded p-3 flex gap-3 shadow-neo-sm group-hover:bg-[#FFE600] group-hover:dark:bg-[#FFE600] transition-colors">
                        <div className="w-20 h-20 bg-black shrink-0 relative border-2 border-black rounded overflow-hidden">
                          <Image src={relatedPost.coverImage} alt={relatedPost.title} fill className="object-cover" />
                        </div>
                        <div className="flex flex-col justify-center">
                          <h4 className="font-display font-black text-sm uppercase text-black dark:group-hover:text-black leading-tight line-clamp-2 mb-1">
                            {relatedPost.title}
                          </h4>
                          <span className="font-mono-code text-[10px] font-bold text-gray-500 dark:group-hover:text-gray-700">
                            {relatedPost.publishDate}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Discussion Section */}
        <section className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-t-8 border-black w-full py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="w-8 h-8 text-[#FF8A3D]" />
              <h2 className="font-display font-black text-4xl uppercase tracking-tight">TERMINAL CHAT ({post.comments.length})</h2>
            </div>

            {/* Comment Input */}
            <div className="bg-white dark:bg-[#2a2622] border-4 border-black rounded-lg p-4 sm:p-6 shadow-neo mb-10 relative">
              <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#FF6B97] text-white font-mono-code text-[10px] font-bold px-2 py-1 border-2 border-black rounded uppercase">
                Requires Auth
              </div>
              <textarea
                placeholder="JACK IN AND SOUND OFF..."
                className="w-full h-24 resize-none bg-transparent border-none focus:outline-none font-sans font-medium text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-600 mb-4"
              />
              <div className="flex justify-between items-center border-t-2 border-dashed border-gray-300 dark:border-gray-700 pt-4">
                <span className="font-mono-code text-xs text-gray-500">HTML disabled. Markdown supported.</span>
                <button className="bg-black text-white hover:bg-[#4DEEEA] hover:text-black border-2 border-black font-display font-black text-sm px-6 py-2 rounded shadow-neo-sm transition-all uppercase">
                  SUBMIT LOG
                </button>
              </div>
            </div>

            {/* Comment List */}
            <div className="space-y-6">
              {post.comments.map((c, i) => (
                <div key={i} className="bg-white dark:bg-[#2a2622] border-2 border-black rounded p-4 sm:p-5 shadow-neo-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center font-display text-white text-sm font-black border border-black">
                        {c.avatar || c.author.charAt(0)}
                      </div>
                      <span className="font-mono-code text-xs font-bold text-black dark:text-white uppercase">
                        {c.author}
                      </span>
                    </div>
                    <span className="font-mono-code text-[10px] font-bold text-gray-500">
                      {c.timeAgo || 'JUST NOW'}
                    </span>
                  </div>

                  <p className="font-sans text-xs sm:text-sm text-black dark:text-white leading-relaxed font-medium">
                    {c.content}
                  </p>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button className="bg-[#FAF4EB] dark:bg-[#1e1b18] border border-black px-2.5 py-1 rounded font-mono-code text-[11px] font-bold hover:bg-[#FFE600] hover:text-black transition-colors cursor-pointer flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> AGREE ({c.upvotes || 0})
                    </button>
                    <button className="bg-[#FAF4EB] dark:bg-[#1e1b18] border border-black px-2.5 py-1 rounded font-mono-code text-[11px] font-bold hover:bg-[#FF6B97] hover:text-white transition-colors cursor-pointer">
                      REPLY +
                    </button>
                  </div>

                  {/* Nested Editorial reply if exists */}
                  {c.editorialReply && (
                    <div className="mt-3 ml-4 bg-[#FF8A3D] text-black border-2 border-black p-3.5 rounded shadow-neo-sm space-y-1">
                      <div className="font-mono-code text-[10px] font-black uppercase flex items-center gap-1">
                        <span>EDITORIAL RESPONSE:</span>
                        <span className="underline">{c.editorialReply.author}</span>
                      </div>
                      <p className="font-sans text-xs font-semibold leading-relaxed">
                        {c.editorialReply.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* AI Modals */}
      <SearchDrawerModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <AISummarizerModal
        isOpen={aiSummaryOpen}
        onClose={() => setAiSummaryOpen(false)}
        articleTitle={post.title}
        articleContent={post.excerpt}
      />
    </div>
  );
}
