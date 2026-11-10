import React from 'react';
import { serverFetch } from '@/lib/api/serverFetch';
import ArticlesPageClient from '@/components/ArticlesPageClient';

export default async function ArticlesPage() {
  let initialCategories = [];
  let initialPosts = [];

  try {
    const [categoriesData, postsData] = await Promise.all([
      serverFetch<any>('/api/v1/categories/'),
      serverFetch<any>('/api/v1/posts/')
    ]);
    initialCategories = categoriesData || [];
    initialPosts = postsData.results || postsData || [];
  } catch (error) {
    console.error('Failed to fetch data for ArticlesPage:', error);
  }

  return <ArticlesPageClient initialCategories={initialCategories} initialPosts={initialPosts} />;
}
