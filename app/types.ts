export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
}

export interface TopicAnalysis {
  topics: string[];
  summary: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  score: number;
  created: number;
}

export interface VideoIdea {
  title: string;
  thumbDesign: string;
  videoIdea: string;
}

export interface AnalysisResult {
  channelName: string;
  videos: YouTubeVideo[];
  topics: TopicAnalysis;
  news: NewsArticle[];
  redditPosts: RedditPost[];
  videoIdeas: VideoIdea[];
}

