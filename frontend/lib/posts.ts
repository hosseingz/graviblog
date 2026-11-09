export interface Post {
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    author: { name: string; avatar: string };
    publishDate: string;
    readTime: string;
    likes: number;
    bookmarks: number;
    coverImage: string;
    tags: string[];
    categoryColor?: string;
    issueNumber?: string;
}
export interface Comment {
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
export const POSTS: Post[] = [];
