// Shared external API functions
import axios from 'axios';
import type { NewsArticle, RedditPost } from '@/app/types';

export async function fetchRelevantNews(topics: string[]): Promise<NewsArticle[]> {
  if (topics.length === 0) return [];

  const query = topics.slice(0, 3).join(' OR ');
  const today = new Date().toISOString().split('T')[0];

  try {
    if (process.env.NEWS_API_KEY) {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          from: today,
          to: today,
          sortBy: 'relevancy',
          pageSize: 10,
          apiKey: process.env.NEWS_API_KEY,
        },
        timeout: 10000, // 10 second timeout
      });

      return (response.data.articles || []).map((article: any) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
      }));
    }
    return [];
  } catch (error: any) {
    // Log but don't throw - graceful degradation
    console.error('Error fetching news:', error.message);
    return [];
  }
}

export async function searchRedditPosts(topics: string[]): Promise<RedditPost[]> {
  if (topics.length === 0) return [];

  const allPosts: RedditPost[] = [];

  // Search Reddit using their JSON API (no auth required for read-only)
  for (const topic of topics.slice(0, 3)) {
    try {
      const response = await axios.get(`https://www.reddit.com/search.json`, {
        params: {
          q: topic,
          sort: 'relevance',
          limit: 5,
          t: 'week', // Last week
        },
        headers: {
          'User-Agent': 'TubeAI/1.0',
        },
        timeout: 10000, // 10 second timeout
      });

      const posts = (response.data.data?.children || []).map((child: any) => ({
        title: child.data.title,
        url: `https://reddit.com${child.data.permalink}`,
        subreddit: child.data.subreddit,
        score: child.data.score,
        created: child.data.created_utc,
      }));

      allPosts.push(...posts);
    } catch (error: any) {
      // Log but continue - graceful degradation
      console.error(`Error searching Reddit for ${topic}:`, error.message);
    }
  }

  // Remove duplicates and sort by score
  const uniquePosts = allPosts.filter((post, index, self) =>
    index === self.findIndex(p => p.url === post.url)
  );

  return uniquePosts.sort((a, b) => b.score - a.score).slice(0, 15);
}

