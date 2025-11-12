import { NextRequest } from 'next/server';
import { getChannelIdFromUrl } from '@/app/utils/youtube';
import { getClientIdentifier, checkRateLimit, RATE_LIMITS } from '@/app/utils/rateLimit';
import { fetchChannelVideos, youtube } from '@/app/lib/youtube-service';
import { analyzeTopics, generateVideoIdeas } from '@/app/lib/ai-service';
import { fetchRelevantNews, searchRedditPosts } from '@/app/lib/external-apis';

// Streaming version - sends results as they become available
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimit = checkRateLimit(
          clientId,
          RATE_LIMITS.PER_IP.maxRequests,
          RATE_LIMITS.PER_IP.windowSeconds
        );

        if (!rateLimit.allowed) {
          send({
            type: 'error',
            message: `Rate limit exceeded. Please try again after ${new Date(rateLimit.resetAt).toLocaleTimeString()}`,
            resetAt: rateLimit.resetAt,
          });
          controller.close();
          return;
        }

        const { url } = await request.json();

        if (!url) {
          send({ type: 'error', message: 'URL is required' });
          controller.close();
          return;
        }

        if (!process.env.YOUTUBE_API_KEY || !process.env.OPENAI_API_KEY) {
          send({ type: 'error', message: 'API keys not configured' });
          controller.close();
          return;
        }

        // Step 1: Get channel ID and fetch videos
        send({ type: 'status', message: 'Fetching channel videos...' });
        const channelId = await getChannelIdFromUrl(youtube, url);
        if (!channelId) {
          send({ type: 'error', message: 'Could not extract channel ID from URL' });
          controller.close();
          return;
        }

        // Additional rate limiting per channel
        const channelRateLimit = checkRateLimit(
          `channel:${channelId}`,
          RATE_LIMITS.PER_CHANNEL.maxRequests,
          RATE_LIMITS.PER_CHANNEL.windowSeconds
        );

        if (!channelRateLimit.allowed) {
          send({
            type: 'error',
            message: 'Too many requests for this channel. Please try again later.',
          });
          controller.close();
          return;
        }

        const { videos, channelName } = await fetchChannelVideos(channelId);
        send({ type: 'videos', data: { videos, channelName } });

        // Step 2: Analyze topics
        send({ type: 'status', message: 'Analyzing topics...' });
        const topics = await analyzeTopics(videos);
        send({ type: 'topics', data: topics });

        // Step 3: Fetch news and Reddit in parallel
        send({ type: 'status', message: 'Fetching news and Reddit discussions...' });
        const [newsResult, redditResult] = await Promise.allSettled([
          fetchRelevantNews(topics.topics),
          searchRedditPosts(topics.topics),
        ]);

        const news = newsResult.status === 'fulfilled' ? newsResult.value : [];
        const redditPosts = redditResult.status === 'fulfilled' ? redditResult.value : [];

        if (news.length > 0) {
          send({ type: 'news', data: news });
        }
        if (redditPosts.length > 0) {
          send({ type: 'reddit', data: redditPosts });
        }

        // Step 4: Generate video ideas
        send({ type: 'status', message: 'Generating video ideas...' });
        const videoIdeas = await generateVideoIdeas(videos, topics.topics, news, redditPosts);
        send({ type: 'ideas', data: videoIdeas });

        send({ type: 'complete' });
        controller.close();
      } catch (error: any) {
        send({ type: 'error', message: error.message || 'An error occurred' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
