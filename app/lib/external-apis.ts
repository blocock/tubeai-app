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
      // Try the search endpoint with proper formatting
      const searchUrl = `https://www.reddit.com/search.json`;
      const response = await axios.get(searchUrl, {
        params: {
          q: topic,
          sort: 'relevance',
          limit: 5,
          t: 'week', // Last week
          restrict_sr: 'false', // Search all subreddits
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.reddit.com/',
          'Origin': 'https://www.reddit.com',
        },
        timeout: 20000, // 20 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        maxRedirects: 5,
      });

      // Check if response is valid
      if (!response.data) {
        console.warn(`Reddit API returned no data for topic: ${topic}`);
        continue;
      }

      // Handle both direct data and nested data structures
      const children = response.data.data?.children || response.data.children || [];
      
      if (!Array.isArray(children) || children.length === 0) {
        console.warn(`Reddit API returned no posts for topic: ${topic}`);
        continue;
      }

      const posts = children.map((child: any) => {
        const data = child.data || child;
        if (!data || !data.title) return null;
        
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

      allPosts.push(...posts);
      console.log(`Found ${posts.length} Reddit posts for topic: ${topic}`);
    } catch (error: any) {
      // Log detailed error for debugging
      const errorMessage = error.response 
        ? `Status ${error.response.status}: ${error.response.statusText}`
        : error.message || 'Unknown error';
      console.error(`Error searching Reddit for "${topic}":`, errorMessage);
      
      // Log response data if available
      if (error.response?.data) {
        const errorData = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 200)
          : JSON.stringify(error.response.data).substring(0, 200);
        console.error('Reddit API error response:', errorData);
      }
      
      // Log request details for debugging
      if (error.config) {
        console.error('Reddit API request URL:', error.config.url);
        console.error('Reddit API request params:', error.config.params);
      }
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

