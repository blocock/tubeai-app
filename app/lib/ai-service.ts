// Shared AI service functions
import OpenAI from 'openai';
import type { YouTubeVideo, NewsArticle, RedditPost, VideoIdea } from '@/app/types';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/app/utils/cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeTopics(videos: YouTubeVideo[]): Promise<{ topics: string[], summary: string }> {
  // Create cache key from video IDs
  const videoIds = videos.map(v => v.id).sort().join(',');
  const cacheKey = `topics:${videoIds}`;
  
  // Check cache
  const cached = getCached<{ topics: string[], summary: string }>(cacheKey);
  if (cached) {
    return cached;
  }

  const videoTitles = videos.map(v => v.title).join('\n');
  const videoDescriptions = videos.map(v => v.description.substring(0, 500)).join('\n');

  const prompt = `Analyze the following YouTube videos from a channel and identify the main topics covered. 
  
Video Titles:
${videoTitles}

Video Descriptions (first 500 chars each):
${videoDescriptions}

Please provide:
1. A list of 5-10 main topics/keywords that this channel covers
2. A brief summary (2-3 sentences) of the channel's content focus

Respond in JSON format:
{
  "topics": ["topic1", "topic2", ...],
  "summary": "brief summary here"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing YouTube content and identifying topics. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const response = JSON.parse(completion.choices[0].message.content || '{}');
  const result = {
    topics: response.topics || [],
    summary: response.summary || '',
  };

  // Cache the result
  setCached(cacheKey, result, CACHE_TTL.TOPIC_ANALYSIS);

  return result;
}

export async function generateVideoIdeas(
  videos: YouTubeVideo[],
  topics: string[],
  news: NewsArticle[],
  redditPosts: RedditPost[]
): Promise<VideoIdea[]> {
  const videoTitles = videos.map(v => v.title).join('\n');
  const newsTitles = news.map(n => n.title).join('\n');
  const redditTitles = redditPosts.map(p => p.title).join('\n');

  const prompt = `Based on the following information, generate 5 potential video ideas for this YouTube channel.

Recent Video Titles (to understand the style):
${videoTitles}

Main Topics Covered:
${topics.join(', ')}

Recent Relevant News:
${newsTitles || 'No recent news found'}

Reddit Discussions:
${redditTitles || 'No Reddit discussions found'}

Generate 5 video ideas that:
1. Match the channel's content style and topics
2. Are relevant to current news and discussions
3. Have engaging titles in the same style as the existing videos
4. Include thumbnail design suggestions
5. Include a detailed video idea/outline

Respond in JSON format:
{
  "ideas": [
    {
      "title": "Video title in the same style",
      "thumbDesign": "Description of thumbnail design (colors, text, imagery)",
      "videoIdea": "Detailed video idea and outline"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert YouTube content strategist. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const response = JSON.parse(completion.choices[0].message.content || '{}');
  return response.ideas || [];
}

