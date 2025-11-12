// Shared YouTube service functions
import { youtube_v3 } from '@googleapis/youtube';
import type { YouTubeVideo } from '@/app/types';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/app/utils/cache';

const youtube = new youtube_v3.Youtube({
  auth: process.env.YOUTUBE_API_KEY,
});

export async function fetchChannelVideos(channelId: string): Promise<{ videos: YouTubeVideo[], channelName: string }> {
  // Check cache first
  const cacheKey = CACHE_KEYS.channelVideos(channelId);
  const cached = await getCached<{ videos: YouTubeVideo[], channelName: string }>(cacheKey);
  if (cached) {
    return cached;
  }

  // First get channel info
  const channelResponse = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    id: [channelId],
  });

  const channelName = channelResponse.data.items?.[0]?.snippet?.title || 'Unknown Channel';

  // Get uploads playlist ID
  const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  
  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist');
  }

  // Get videos from uploads playlist
  const playlistResponse = await youtube.playlistItems.list({
    part: ['snippet', 'contentDetails'],
    playlistId: uploadsPlaylistId,
    maxResults: 10,
  });

  const videoIds = playlistResponse.data.items
    ?.map(item => item.contentDetails?.videoId)
    .filter((id): id is string => !!id) || [];

  if (videoIds.length === 0) {
    throw new Error('No videos found');
  }

  // Get video details
  const videosResponse = await youtube.videos.list({
    part: ['snippet', 'statistics'],
    id: videoIds,
  });

  const videos: YouTubeVideo[] = (videosResponse.data.items || []).map(video => ({
    id: video.id || '',
    title: video.snippet?.title || '',
    description: video.snippet?.description || '',
    publishedAt: video.snippet?.publishedAt || '',
    thumbnail: video.snippet?.thumbnails?.high?.url || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }));

  const result = { videos, channelName };
  
  setCached(cacheKey, result, CACHE_TTL.CHANNEL_VIDEOS).catch(console.error);

  return result;
}

export { youtube };

