import { NextRequest } from 'next/server';
import { getChannelIdFromUrl } from '@/app/utils/youtube';
import { getClientIdentifier, checkRateLimit, RATE_LIMITS } from '@/app/utils/rateLimit';
import { fetchChannelVideos, youtube } from '@/app/lib/youtube-service';
import { analyzeTopics, generateVideoIdeas } from '@/app/lib/ai-service';
import { fetchRelevantNews, searchRedditPosts } from '@/app/lib/external-apis';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
  });

  // Process async without blocking
  (async () => {
    const send = (data: any) => {
      if (!controller) return;
      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error('Error sending stream data:', error);
      }
    };

    const close = () => {
      if (controller) {
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing stream:', error);
        }
      }
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
        close();
        return;
      }

      const { url } = await request.json();

      if (!url) {
        send({ type: 'error', message: 'URL is required' });
        close();
        return;
      }

      if (!process.env.YOUTUBE_API_KEY || !process.env.OPENAI_API_KEY) {
        send({ type: 'error', message: 'API keys not configured' });
        close();
        return;
      }

      // Step 1: Get channel ID and fetch videos
      send({ type: 'status', message: 'Fetching channel videos...' });
      const channelId = await getChannelIdFromUrl(youtube, url);
      if (!channelId) {
        send({ type: 'error', message: 'Could not extract channel ID from URL' });
        close();
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
        close();
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
      close();
    } catch (error: any) {
      send({ type: 'error', message: error.message || 'An error occurred' });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
