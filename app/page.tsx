'use client';

import { useState } from 'react';
import type { AnalysisResult, VideoIdea, YouTubeVideo, NewsArticle, RedditPost } from './types';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<Partial<AnalysisResult>>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus('');
    setResult({});

    try {
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'status':
                  setStatus(data.message);
                  break;
                case 'videos':
                  setResult(prev => ({ ...prev, videos: data.data.videos, channelName: data.data.channelName }));
                  setStatus('');
                  break;
                case 'topics':
                  setResult(prev => ({ ...prev, topics: data.data }));
                  setStatus('');
                  break;
                case 'news':
                  setResult(prev => ({ ...prev, news: data.data }));
                  break;
                case 'reddit':
                  setResult(prev => ({ ...prev, redditPosts: data.data }));
                  break;
                case 'ideas':
                  setResult(prev => ({ ...prev, videoIdeas: data.data }));
                  setStatus('');
                  break;
                case 'complete':
                  setLoading(false);
                  setStatus('');
                  break;
                case 'error':
                  setError(data.message);
                  setLoading(false);
                  setStatus('');
                  break;
              }
            } catch (err) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
      setStatus('');
    }
  };

  const hasAnyResult = result.videos || result.topics || result.videoIdeas;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
            TubeAI
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            AI-Powered YouTube Content Ideas Generator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter YouTube channel URL (e.g., https://www.youtube.com/@channelname)"
              className="flex-1 px-6 py-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze Channel'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {loading && status && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>{status}</span>
            </div>
          </div>
        )}

        {loading && !status && !hasAnyResult && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Starting analysis...
            </p>
          </div>
        )}

        {hasAnyResult && <ResultsDisplay result={result} loading={loading} />}
      </div>
    </div>
  );
}

function ResultsDisplay({ result, loading }: { result: Partial<AnalysisResult>; loading: boolean }) {
  return (
    <div className="space-y-8">
      {/* Channel Info - Show when we have channel name and topics */}
      {result.channelName && result.topics && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {result.channelName}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            {result.topics.summary}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.topics.topics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Videos - Show as soon as available */}
      {result.videos && result.videos.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Recent Videos (Last 10)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.videos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:scale-105 transition-transform"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full rounded-lg mb-2"
                />
                <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {video.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* News Articles - Show when available */}
      {result.news && result.news.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Relevant News This Week
          </h2>
          <div className="space-y-3">
            {result.news.map((article, idx) => (
              <a
                key={idx}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {article.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reddit Posts - Show when available */}
      {result.redditPosts && result.redditPosts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Reddit Discussions
          </h2>
          <div className="space-y-3">
            {result.redditPosts.map((post, idx) => (
              <a
                key={idx}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  r/{post.subreddit} • {post.score} upvotes
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Video Ideas - Show when available */}
      {result.videoIdeas && result.videoIdeas.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            🎬 Generated Video Ideas
          </h2>
          <div className="space-y-6">
            {result.videoIdeas.map((idea, idx) => (
              <VideoIdeaCard key={idx} idea={idea} index={idx + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator at bottom if still loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

function VideoIdeaCard({ idea, index }: { idea: VideoIdea; index: number }) {
  return (
    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
          {index}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            {idea.title}
          </h3>
          <div className="mb-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Thumbnail Design:
            </h4>
            <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              {idea.thumbDesign}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Video Idea:
            </h4>
            <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg whitespace-pre-line">
              {idea.videoIdea}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
