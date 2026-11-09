'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchDrawerModal from '@/components/SearchDrawerModal';
import AISummarizerModal from '@/components/AISummarizerModal';
import PostCard from '@/components/PostCard';
import { POSTS, Comment } from '@/lib/posts';
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

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [searchOpen, setSearchOpen] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);

  // Find post
  const post = POSTS.find((p) => p.slug === slug) || POSTS[0];

  // Interactive Likes state
  const [likes, setLikes] = useState(post.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [shared, setShared] = useState(false);

  // Comment submission form state
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState<Comment[]>(post.comments || []);
  const [commentSubmitted, setCommentSubmitted] = useState(false);

  const handleLikeToggle = () => {
    if (!hasLiked) {
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    } else {
      setLikes((prev) => prev - 1);
      setHasLiked(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (handle.trim() && commentText.trim()) {
      const newC: Comment = {
        id: 'c_' + Date.now(),
        author: handle.toUpperCase().replace(/\s+/g, '_'),
        badge: 'CYBER READER',
        timeAgo: 'JUST NOW',
        content: commentText,
        upvotes: 1,
      };
      setCommentsList([newC, ...commentsList]);
      setCommentText('');
      setCommentSubmitted(true);
      setTimeout(() => setCommentSubmitted(false), 4000);
    }
  };

  // Similar dispatches
  const similarPosts = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7]">
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Breadcrumb Navigation & Top Tags Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-3">
          <div className="flex items-center gap-2 font-mono-code text-xs font-bold text-gray-700 dark:text-gray-300">
            <Link href="/" className="hover:underline">HOME</Link>
            <span>/</span>
            <Link href="/articles" className="hover:underline">{post.category}</Link>
            <span>/</span>
            <span className="text-black dark:text-white uppercase truncate max-w-[200px]">
              {post.slug}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#4DEEEA] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
              ★ FIELD VERIFIED
            </span>
            <span className="bg-[#FFE600] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-0.5 rounded shadow-neo-sm">
              HOT DROP
            </span>
          </div>
        </div>

        {/* Main Article Header Card matching post-detail_aac674a2.png */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg relative overflow-hidden">
          {/* Sticker Tag */}
          <div className="absolute top-4 right-4 bg-[#FF6B97] text-black border-2 border-black font-mono-code text-[11px] font-black px-3 py-1 rounded shadow-neo-sm transform rotate-2 hidden sm:block">
            HOT DROP ★
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
              ★ HARDWARE DEEP DIVE
            </span>
            <span className="bg-[#FF6B97] text-white border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
              BENCHMARK BREAKDOWN
            </span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-black dark:text-white leading-[0.98] mb-6">
            {post.title}
          </h1>

          {/* Author bar & Action controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-3 border-black">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#FF8A3D] text-black border-2 border-black flex items-center justify-center font-mono-code font-black text-sm shrink-0">
                {post.author.avatar}
              </div>
              <div>
                <div className="font-display font-black text-base text-black dark:text-white uppercase flex items-center gap-2">
                  <span>{post.author.name}</span>
                  <span className="bg-black text-white text-[10px] font-mono-code px-1.5 py-0.5 rounded">STAFF</span>
                </div>
                <div className="font-mono-code text-xs text-gray-600 dark:text-gray-400 font-bold">
                  {post.author.role} · {post.publishDate} · {post.readTime}
                </div>
              </div>
            </div>

            {/* Share / Like / Bookmark Actions */}
            <div className="flex items-center gap-2">
              {/* AI Summary Button */}
              <button
                onClick={() => setAiSummaryOpen(true)}
                className="bg-[#FFE600] hover:bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-2 rounded shadow-neo-sm hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Summarize with Gemini AI"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>AI TL;DR</span>
              </button>

              <button
                onClick={handleShare}
                className="bg-white dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-xs font-bold px-3 py-2 rounded shadow-neo-sm hover:shadow-neo transition-all flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{shared ? 'COPIED!' : 'SHARE'}</span>
              </button>

              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`${
                  bookmarked ? 'bg-[#FF6B97] text-black' : 'bg-white dark:bg-[#2a2622] text-black dark:text-white'
                } border-2 border-black font-mono-code text-xs font-bold px-3 py-2 rounded shadow-neo-sm transition-all cursor-pointer`}
              >
                <Bookmark className="w-4 h-4" />
              </button>

              <button
                onClick={handleLikeToggle}
                className={`${
                  hasLiked ? 'bg-[#FF8A3D] text-black font-black' : 'bg-white dark:bg-[#2a2622] text-black dark:text-white'
                } border-2 border-black font-mono-code text-xs font-bold px-3 py-2 rounded shadow-neo-sm hover:shadow-neo transition-all flex items-center gap-1.5 cursor-pointer`}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-black' : ''}`} />
                <span>{likes}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hero Featured Media Frame */}
        <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-3 sm:p-4 shadow-neo-lg space-y-2">
          <div className="relative w-full aspect-[16/9] bg-[#12100e] border-3 border-black rounded overflow-hidden shadow-neo">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1000px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
            <div className="absolute top-3 left-3 bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-2.5 py-1 rounded shadow-neo-sm">
              LAB REPORT 2025
            </div>
          </div>
          {post.caption && (
            <p className="font-mono-code text-xs text-center text-gray-700 dark:text-gray-300 font-bold tracking-wide pt-1">
              {post.caption}
            </p>
          )}
        </div>

        {/* Grid Layout for Article Body + Right Side Rig Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Article Content Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-8 font-sans">
            {/* Intro Prose */}
            <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg p-6 sm:p-8 shadow-neo space-y-4 text-base sm:text-lg leading-relaxed text-black dark:text-white font-medium">
              <p className="first-letter:font-display first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-3 first-letter:text-[#FF8A3D] first-letter:leading-none">
                For nearly two decades, the tech industry shoved 60 frames per second down our throats as the definitive benchmark for buttery performance. Turn on V-Sync, lock it at 60Hz, and consider your battle station conquered. In 2025, that standard is officially dead.
              </p>
              <p>
                Competitive gaming has undergone an undeniable tectonic shift. Once the playground of high-bracket Counter-Strike purists obsessing over phosphor lag on oversized CRTs, refresh rate supremacy has gone completely mainstream. Whether you&apos;re climbing the ladder in <strong>Apex Legends</strong>, holding down a site in <strong>Valorant</strong>, or tracking micro-flicks in fighting tournaments, 60 frames is no longer acceptable fidelity—it is a physical penalty.
              </p>
            </div>

            {/* Highlight Quote Box */}
            <div className="bg-[#4DEEEA] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg text-black space-y-3 relative overflow-hidden">
              <div className="font-display font-black text-6xl text-black/20 absolute top-2 left-3 leading-none select-none">
                &ldquo;
              </div>
              <blockquote className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight relative z-10 leading-snug">
                &quot;PLAYING AN ESPORTS TACTICAL SHOOTER AT 60HZ TODAY IS THE MECHANICAL EQUIVALENT OF RACING IN FORMULA 1 WITH PUNCTURED RADIAL TIRES.&quot;
              </blockquote>
              <div className="font-mono-code text-xs font-bold tracking-wider uppercase text-black/80 border-t-2 border-black pt-2">
                — DR. HARD TEKK // COGNITIVE LABS
              </div>
            </div>

            {/* Section 2 Prose */}
            <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg p-6 sm:p-8 shadow-neo space-y-4 text-base sm:text-lg leading-relaxed text-black dark:text-white font-medium">
              <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white border-b-3 border-black pb-2 mb-4">
                THE BIOLOGY OF INPUT LAG: IT&apos;S NOT IN YOUR HEAD
              </h2>

              <p>
                Skeptics always say the same tired trope: <em>&quot;The human eye can only process 30 frames anyway.&quot;</em> This has been thoroughly debunked by sports optometry and motion photonics. The advantage of a 120Hz or 240Hz pipeline isn&apos;t just smoother animation across moving backgrounds—it is the direct reduction of render-to-photon latency.
              </p>
            </div>

            {/* Custom Data Table: REFRESH LATENCY MATRIX */}
            {post.benchmarkData && (
              <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-5 sm:p-6 shadow-neo space-y-4">
                <div className="flex items-center justify-between border-b-3 border-black pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white font-mono-code text-xs font-bold px-2 py-0.5 rounded">
                      LAB DATA
                    </span>
                    <h3 className="font-display font-black text-lg text-black dark:text-white uppercase">
                      {post.benchmarkData.title}
                    </h3>
                  </div>
                  <span className="font-mono-code text-[11px] font-bold text-gray-500">
                    LDAT DIGITIZER PROBE V2.1
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-2 border-black font-mono-code text-xs">
                    <thead>
                      <tr className="bg-[#FF8A3D] text-black border-b-2 border-black font-black">
                        <th className="p-3 border-r-2 border-black">TARGET REFRESH</th>
                        <th className="p-3 border-r-2 border-black">FRAME TIME</th>
                        <th className="p-3 border-r-2 border-black">END-TO-END LAG</th>
                        <th className="p-3">HIT CONFIRMATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black font-bold">
                      {post.benchmarkData.rows.map((row, idx) => (
                        <tr key={idx} className="bg-white dark:bg-[#2a2622] hover:bg-[#fff9ef] dark:hover:bg-[#322c28]">
                          <td className="p-3 border-r-2 border-black font-black flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded border border-black ${row.statusColor}`}>
                              {row.target}
                            </span>
                          </td>
                          <td className="p-3 border-r-2 border-black text-black dark:text-white">
                            {row.frameTime}
                          </td>
                          <td className="p-3 border-r-2 border-black font-black text-black dark:text-white">
                            {row.endToEndLag}
                          </td>
                          <td className="p-3 font-black text-black dark:text-white">
                            {row.hitConfirmation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* OLED Revolution Callout Card */}
            <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-3 border-black rounded-lg p-5 shadow-neo flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-48 aspect-[16/10] bg-black border-2 border-black rounded overflow-hidden shrink-0">
                <Image
                  src="https://picsum.photos/seed/oledtech/400/250"
                  alt="OLED panel"
                  fill
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="bg-[#FF6B97] text-black border border-black font-mono-code text-[10px] font-black px-2 py-0.5 rounded">
                  PANEL TELEMETRY
                </span>
                <h4 className="font-display font-black text-base text-black dark:text-white uppercase">
                  THE OLED REVOLUTION ACCELERATES THE GAP
                </h4>
                <p className="font-sans text-xs text-gray-700 dark:text-gray-300">
                  Instant sub-millisecond pixel response time combined with 120Hz refresh rates eliminates ghosting artifacts entirely.
                </p>
              </div>
            </div>

            {/* Key Takeaways Box matching post-detail_aac674a2.png */}
            {post.keyTakeaways && (
              <div className="bg-[#ffdbc9] dark:bg-[#2a221b] border-4 border-black rounded-lg p-6 shadow-neo space-y-4 text-black dark:text-white">
                <div className="flex items-center gap-2 border-b-3 border-black pb-2">
                  <Zap className="w-5 h-5 text-[#FF8A3D] fill-[#FF8A3D]" />
                  <h3 className="font-display font-black text-xl uppercase tracking-tight">
                    KEY TAKEAWAYS FOR YOUR NEXT RIG
                  </h3>
                </div>

                <ul className="space-y-3 font-sans font-medium text-sm">
                  {post.keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle className="w-5 h-5 text-[#FF8A3D] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Article Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t-3 border-black">
              <span className="font-mono-code text-xs font-bold text-gray-500 uppercase">TAGS:</span>
              {post.tags.map((t, i) => (
                <span
                  key={i}
                  className="bg-white dark:bg-[#2a2622] text-black dark:text-white border-2 border-black font-mono-code text-xs font-bold px-3 py-1 rounded shadow-neo-sm"
                >
                  #{t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column Sidebar: Author & Test Bench Rig (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Author Profile Card */}
            <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-5 shadow-neo space-y-3">
              <div className="flex items-center gap-3 border-b-2 border-black pb-3">
                <div className="w-12 h-12 rounded bg-[#FF8A3D] text-black border-2 border-black flex items-center justify-center font-mono-code font-black text-lg">
                  {post.author.avatar}
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-black dark:text-white uppercase leading-tight">
                    {post.author.name}
                  </h4>
                  <span className="font-mono-code text-[11px] text-gray-600 dark:text-gray-400 font-bold">
                    {post.author.role}
                  </span>
                </div>
              </div>

              <p className="font-sans text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {post.author.bio}
              </p>

              <button 
                onClick={() => router.push('/articles?author=' + post.author.name)}
                className="w-full bg-white dark:bg-[#2a2622] hover:bg-[#FFE600] text-black dark:text-white hover:text-black border-2 border-black font-mono-code text-xs font-black py-2 rounded shadow-neo-sm transition-all uppercase cursor-pointer"
              >
                READ ALL DISPATCHES BY {post.author.avatar} →
              </button>
            </div>

            {/* Test Bench Rig Box */}
            {post.testBenchRig && (
              <div className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-5 shadow-neo space-y-3">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <span className="font-display font-black text-base text-black dark:text-white uppercase">
                    TEST BENCH RIG
                  </span>
                  <Cpu className="w-4 h-4 text-[#FF8A3D]" />
                </div>

                <div className="space-y-2 font-mono-code text-xs font-bold">
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">CPU</span>
                    <span className="text-black dark:text-white">{post.testBenchRig.cpu}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">GPU</span>
                    <span className="text-black dark:text-white">{post.testBenchRig.gpu}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">DISPLAY</span>
                    <span className="text-black dark:text-white">{post.testBenchRig.display}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">SENSOR</span>
                    <span className="text-black dark:text-white">{post.testBenchRig.sensor}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-gray-500">OS</span>
                    <span className="text-black dark:text-white">{post.testBenchRig.os}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Zine Volume Ad Banner */}
            <div className="bg-[#FFE600] border-4 border-black rounded-lg p-5 shadow-neo-lg text-black space-y-3 relative overflow-hidden">
              <div className="bg-[#FF6B97] text-white border-2 border-black font-mono-code text-[10px] font-black px-2 py-0.5 rounded shadow-neo-sm inline-block">
                LIMITED PHYSICAL DROP
              </div>

              <h4 className="font-display font-black text-2xl uppercase tracking-tight leading-none">
                PIXEL PUNCH ZINE VOL. 03
              </h4>

              <p className="font-sans text-xs font-semibold leading-snug">
                140 pages of unapologetic gaming culture, foil-stamped sticker pack included.
              </p>

              <button 
                onClick={() => alert('Zine Volume 03 Order window opening next Thursday!')}
                className="w-full bg-[#FF8A3D] hover:bg-[#ff7521] text-black border-3 border-black font-display font-black text-xs py-2.5 px-4 rounded shadow-neo-sm uppercase cursor-pointer"
              >
                CLAIM YOUR COPY ($18) ⚡
              </button>
            </div>
          </div>
        </div>

        {/* Similar Dispatches Section */}
        <section className="space-y-6 pt-6 border-t-4 border-black">
          <div className="flex items-center justify-between border-b-3 border-black pb-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#FF6B97] text-white font-mono-code text-xs font-black px-2 py-0.5 rounded">
                MORE READS
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
                {"/// SIMILAR DISPATCHES YOU SHOULD READ"}
              </h3>
            </div>
            <Link href="/articles" className="font-mono-code text-xs font-bold text-[#FF8A3D] hover:underline uppercase">
              VIEW HARDWARE VAULT →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>

        {/* Community Discussion / Comments Section matching post-detail_aac674a2.png */}
        <section className="bg-[#FAF4EB] dark:bg-[#1e1b18] border-4 border-black rounded-lg p-6 sm:p-8 shadow-neo-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-3 border-black pb-4">
            <div>
              <span className="bg-[#FF8A3D] text-black border-2 border-black font-mono-code text-xs font-black px-2 py-0.5 rounded shadow-neo-sm">
                OPEN FREQUENCY
              </span>
              <h3 className="font-display font-black text-3xl uppercase tracking-tight text-black dark:text-white mt-1">
                JOIN THE DEBATE // COMMUNITY FREQUENCY
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-[#4DEEEA] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
                NO MODERATION BOTS
              </span>
              <span className="bg-[#FFE600] text-black border-2 border-black font-mono-code text-xs font-black px-3 py-1 rounded shadow-neo-sm">
                18 TRANSMISSIONS
              </span>
            </div>
          </div>

          {/* Comment submission form */}
          <div className="bg-white dark:bg-[#2a2622] border-3 border-black p-5 rounded-lg shadow-neo space-y-4">
            <div className="flex items-center gap-2 font-mono-code text-xs font-black text-black dark:text-white">
              <MessageSquare className="w-4 h-4 text-[#FF8A3D]" />
              <span>DISPATCH YOUR COMMENT</span>
            </div>

            {commentSubmitted && (
              <div className="bg-[#70E000] border-2 border-black p-3 rounded font-mono-code text-xs font-bold text-black flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>COMMENT TRANSMITTED TO COMMUNITY FREQUENCY!</span>
              </div>
            )}

            <form onSubmit={handleAddComment} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono-code text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    YOUR HANDLE / CALLSIGN
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="E.G. GHOST_PARIS_99"
                    required
                    className="w-full bg-[#FAF4EB] dark:bg-[#1e1b18] border-2 border-black p-2.5 text-xs font-mono-code font-bold text-black dark:text-white rounded focus:outline-none shadow-neo-sm"
                  />
                </div>

                <div>
                  <label className="block font-mono-code text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    SECURE COMMS EMAIL (NEVER PUBLISHED)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="PILOT@RESISTANCE.NET"
                    required
                    className="w-full bg-[#FAF4EB] dark:bg-[#1e1b18] border-2 border-black p-2.5 text-xs font-mono-code font-bold text-black dark:text-white rounded focus:outline-none shadow-neo-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-code text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  RAW OBSERVATION / BENCHMARKS
                </label>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="DROP YOUR THOUGHTS, BENCHMARKS, OR HOT TAKES..."
                  required
                  className="w-full bg-[#FAF4EB] dark:bg-[#1e1b18] border-2 border-black p-3 text-xs font-mono-code font-bold text-black dark:text-white rounded focus:outline-none shadow-neo-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono-code text-[10px] font-bold text-gray-500">
                  NOTIFY ME ON REPLIES VIA ENCRYPTED PING
                </span>

                <button
                  type="submit"
                  className="bg-[#FFE600] hover:bg-[#FF8A3D] text-black border-3 border-black font-display font-black text-xs px-6 py-2.5 rounded shadow-neo active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 uppercase cursor-pointer"
                >
                  <span>TRANSMIT COMMENT</span>
                  <Zap className="w-3.5 h-3.5 fill-black" />
                </button>
              </div>
            </form>
          </div>

          {/* Existing comments list */}
          <div className="space-y-4">
            {commentsList.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-[#2a2622] border-3 border-black p-5 rounded-lg shadow-neo space-y-3"
              >
                <div className="flex items-center justify-between border-b-2 border-black/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#4DEEEA] text-black border border-black flex items-center justify-center font-mono-code font-black text-xs">
                      {c.author.substring(0, 2)}
                    </div>
                    <span className="font-display font-black text-sm text-black dark:text-white uppercase">
                      {c.author}
                    </span>
                    {c.badge && (
                      <span className="bg-black text-white text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded">
                        {c.badge}
                      </span>
                    )}
                  </div>
                  <span className="font-mono-code text-[10px] font-bold text-gray-500">
                    {c.timeAgo}
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-black dark:text-white leading-relaxed font-medium">
                  {c.content}
                </p>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button className="bg-[#FAF4EB] dark:bg-[#1e1b18] border border-black px-2.5 py-1 rounded font-mono-code text-[11px] font-bold hover:bg-[#FFE600] hover:text-black transition-colors cursor-pointer flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> AGREE ({c.upvotes})
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
