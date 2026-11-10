import React from 'react';
import { serverFetch } from '@/lib/api/serverFetch';
import ArticleDetailPageClient from '@/components/ArticleDetailPageClient';

// A mock function for generating related posts (since this doesn't seem to have an exact API endpoint, we fetch top popular posts)
async function fetchRelatedPosts() {
    try {
      const data = await serverFetch<any>('/api/v1/posts/?ordering=popular');
      return (data.results || data || []).slice(0, 3);
    } catch (e) {
      console.error('Failed to fetch related posts', e);
      return [];
    }
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // Await the entire params object before destructuring the dynamic segment 'slug'.
  const { slug } = await params;

  let post = null;
  let comments = [];

  try {
    post = await serverFetch<any>(`/api/v1/posts/${slug}/`);
  } catch (error) {
    console.error(`Failed to fetch post details for ${slug}:`, error);
  }

  if (!post) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <h1 className="text-3xl font-bold uppercase">Post Not Found</h1>
          </div>
      )
  }

  try {
    const commentsData = await serverFetch<any>(`/api/v1/posts/${slug}/comments/`);
    comments = commentsData.results || commentsData || [];
  } catch(error) {
    console.error(`Failed to fetch comments for ${slug}:`, error);
  }

  post.comments = comments;
  const relatedPosts = await fetchRelatedPosts();

  return <ArticleDetailPageClient initialPost={post} relatedPosts={relatedPosts} />;
}
