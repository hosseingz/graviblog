import React from 'react';
import { serverFetch } from '@/lib/api/serverFetch';
import HomePageClient from '@/components/HomePageClient';

export default async function HomePage() {
  let initialPosts = [];
  try {
    const data = await serverFetch<any>('/api/v1/posts/');
    initialPosts = data.results || data;
  } catch (error) {
    console.error('Failed to fetch posts for HomePage:', error);
  }

  return <HomePageClient initialPosts={initialPosts} />;
}
