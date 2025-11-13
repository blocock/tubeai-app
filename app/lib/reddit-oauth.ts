// Reddit OAuth token management
import axios from 'axios';
import { getCached, setCached } from '@/app/utils/cache';

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Get Reddit OAuth access token using client credentials flow
 * Tokens are cached to avoid unnecessary requests
 */
export async function getRedditAccessToken(): Promise<string | null> {
  const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
  const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
  const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'TubeAI/1.0 by /u/yourusername';

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    console.error('Reddit OAuth credentials not configured');
    return null;
  }

  // Check cache first
  const cacheKey = 'reddit:access_token';
  const cached = await getCached<{ token: string; expiresAt: number }>(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    // Token is still valid (with 1 minute buffer)
    return cached.token;
  }

  try {
    // Get OAuth token using client credentials flow
    const authString = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post<RedditTokenResponse>(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': REDDIT_USER_AGENT,
        },
        timeout: 10000,
      }
    );

    const { access_token, expires_in } = response.data;
    
    // Cache the token (expires_in is in seconds, convert to milliseconds)
    const expiresAt = Date.now() + (expires_in * 1000);
    await setCached(cacheKey, { token: access_token, expiresAt }, expires_in - 60); // Cache with 1 min buffer
    
    return access_token;
  } catch (error: any) {
    console.error('Error getting Reddit OAuth token:', error.response?.data || error.message);
    return null;
  }
}

