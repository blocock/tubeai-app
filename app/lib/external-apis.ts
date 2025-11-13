// Shared external API functions
import axios from 'axios';
import type { NewsArticle, RedditPost } from '@/app/types';
import { getRedditAccessToken } from './reddit-oauth';

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

/**
 * Search Reddit using OAuth API (preferred) with fallback to public API
 * Uses OAuth if credentials are available, otherwise falls back to public JSON API
 */
async function searchRedditWithOAuth(topic: string): Promise<RedditPost[]> {
  const accessToken = await getRedditAccessToken();
  if (!accessToken) {
    return [];
  }

  const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'TubeAI/1.0 by /u/yourusername';
  
  try {
    const response = await axios.get('https://oauth.reddit.com/search', {
      params: {
        q: topic,
        sort: 'relevance',
        limit: 5,
        t: 'week',
        restrict_sr: 'false',
        type: 'link',
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': REDDIT_USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    if (!response.data?.data?.children) {
      return [];
    }

    return response.data.data.children
      .map((child: any) => {
        const data = child.data;
        if (!data?.title) return null;
        
        return {
          title: data.title,
          url: data.permalink 
            ? `https://reddit.com${data.permalink.startsWith('/') ? '' : '/'}${data.permalink}`
            : `https://reddit.com/r/${data.subreddit}/comments/${data.id}`,
          subreddit: data.subreddit || 'unknown',
          score: data.score || 0,
          created: data.created_utc || data.created || Date.now() / 1000,
        };
      })
      .filter((post: RedditPost | null): post is RedditPost => post !== null);
  } catch (error: any) {
    console.error(`Reddit OAuth search failed for "${topic}":`, error.message);
    return [];
  }
}

/**
 * Search Reddit using public JSON API (fallback)
 */
async function searchRedditPublic(topic: string): Promise<RedditPost[]> {
  try {
    const response = await axios.get('https://www.reddit.com/search.json', {
      params: {
        q: topic,
        sort: 'relevance',
        limit: 5,
        t: 'week',
        restrict_sr: 'false',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    const children = response.data?.data?.children || [];
    if (!Array.isArray(children) || children.length === 0) {
      return [];
    }

    return children.map((child: any) => {
      const data = child.data;
      if (!data?.title) return null;
      
      return {
        title: data.title,
        url: data.permalink 
          ? `https://reddit.com${data.permalink.startsWith('/') ? '' : '/'}${data.permalink}`
          : `https://reddit.com/r/${data.subreddit}/comments/${data.id}`,
        subreddit: data.subreddit || 'unknown',
        score: data.score || 0,
        created: data.created_utc || data.created || Date.now() / 1000,
      };
    }).filter((post): post is RedditPost => post !== null);
  } catch (error: any) {
    console.error(`Reddit public API search failed for "${topic}":`, error.message);
    return [];
  }
}

export async function searchRedditPosts(topics: string[]): Promise<RedditPost[]> {
  if (topics.length === 0) return [];

  const allPosts: RedditPost[] = [];
  const hasOAuth = !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);

  // Search each topic
  for (const topic of topics.slice(0, 3)) {
    let posts: RedditPost[] = [];

    // Try OAuth first if available, otherwise use public API
    if (hasOAuth) {
      posts = await searchRedditWithOAuth(topic);
      // If OAuth returns no results, try public API as fallback
      if (posts.length === 0) {
        console.log(`OAuth returned no results for "${topic}", trying public API...`);
        posts = await searchRedditPublic(topic);
      }
    } else {
      posts = await searchRedditPublic(topic);
    }

    if (posts.length > 0) {
      allPosts.push(...posts);
      console.log(`Found ${posts.length} Reddit posts for topic: ${topic}`);
    } else {
      console.warn(`No Reddit posts found for topic: ${topic}`);
    }
  }

  // Remove duplicates and sort by score
  const uniquePosts = allPosts.filter((post, index, self) =>
    index === self.findIndex(p => p.url === post.url)
  );

  const sortedPosts = uniquePosts.sort((a, b) => b.score - a.score).slice(0, 15);
  console.log(`Total unique Reddit posts: ${sortedPosts.length}`);
  
  return sortedPosts;
}

