import { youtube_v3 } from '@googleapis/youtube';

const URL_PATTERNS = {
  channelId: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
  handle: /youtube\.com\/@([a-zA-Z0-9_-]+)/,
  customUrl: /youtube\.com\/(?:c|user)\/([a-zA-Z0-9_-]+)/,
  video: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
} as const;

export async function getChannelIdFromUrl(
  youtube: youtube_v3.Youtube,
  url: string
): Promise<string | null> {
  const channelIdMatch = url.match(URL_PATTERNS.channelId);
  if (channelIdMatch) {
    const channelId = channelIdMatch[1];
    try {
      const response = await youtube.channels.list({
        part: ['id'],
        id: [channelId],
      });
      if (response.data.items?.[0]?.id) {
        return channelId;
      }
    } catch (error) {
      console.error('Error verifying channel ID:', error);
    }
  }

  const handleMatch = url.match(URL_PATTERNS.handle);
  if (handleMatch) {
    const handle = handleMatch[1];
    try {
      const response = await youtube.channels.list({
        part: ['id'],
        forHandle: handle,
      });
      const channelId = response.data.items?.[0]?.id;
      if (channelId) {
        return channelId;
      }
    } catch (error) {
      console.error('Error fetching channel by handle:', error);
    }
  }

  const videoMatch = url.match(URL_PATTERNS.video);
  if (videoMatch) {
    const videoId = videoMatch[1];
    try {
      const response = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId],
      });
      const channelId = response.data.items?.[0]?.snippet?.channelId;
      if (channelId) {
        return channelId;
      }
    } catch (error) {
      console.error('Error fetching channel from video:', error);
    }
  }

  const customUrlMatch = url.match(URL_PATTERNS.customUrl);
  if (customUrlMatch) {
    const username = customUrlMatch[1];
    try {
      const response = await youtube.search.list({
        part: ['snippet'],
        q: username,
        type: ['channel'],
        maxResults: 1,
      });
      const channelId = response.data.items?.[0]?.snippet?.channelId;
      if (channelId) {
        return channelId;
      }
    } catch (error) {
      console.error('Error searching for channel:', error);
    }
  }

  return null;
}
