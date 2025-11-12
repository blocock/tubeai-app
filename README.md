# TubeAI - AI-Powered YouTube Content Ideas Generator

A Next.js application that analyzes YouTube channels and generates video ideas using AI. The app:

- Fetches the last 10 videos from a YouTube channel
- Analyzes topics covered using AI
- Fetches relevant news articles for today
- Searches Reddit for recent discussions on those topics
- Generates 5 potential video ideas with titles, thumbnail designs, and detailed outlines

## Features

- 🎬 YouTube channel analysis
- 🤖 AI-powered topic extraction
- 📰 Real-time news integration
- 💬 Reddit discussion search
- ✨ AI-generated video ideas with titles, thumbnails, and outlines

## Prerequisites

- Node.js 20.9.0 or higher
- YouTube Data API v3 key
- OpenAI API key
- NewsAPI key (optional, for news fetching)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tubeai-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   NEWS_API_KEY=your_news_api_key_here
   ```

   **Getting API Keys:**
   - **YouTube API Key**: 
     1. Go to [Google Cloud Console](https://console.cloud.google.com/)
     2. Create a new project or select an existing one
     3. Enable the YouTube Data API v3
     4. Create credentials (API Key)
   
   - **OpenAI API Key**:
     1. Go to [OpenAI Platform](https://platform.openai.com/)
     2. Sign up or log in
     3. Navigate to API Keys section
     4. Create a new API key
   
   - **NewsAPI Key** (Optional):
     1. Go to [NewsAPI](https://newsapi.org/register)
     2. Sign up for a free account
     3. Get your API key from the dashboard

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a YouTube channel URL in the input field (supports various formats):
   - `https://www.youtube.com/@channelname`
   - `https://www.youtube.com/c/channelname`
   - `https://www.youtube.com/user/channelname`
   - `https://www.youtube.com/channel/CHANNEL_ID`

2. Click "Analyze Channel"

3. Watch the analysis progress with real-time updates:
   - Videos appear first as soon as they're fetched
   - Then topics are analyzed and displayed
   - News and Reddit discussions load in parallel and appear when ready
   - Finally, video ideas are generated and shown

4. View the results as they stream in:
   - Channel information and topics
   - Recent videos (last 10)
   - Relevant news articles (today)
   - Reddit discussions (last week)
   - 5 generated video ideas with titles, thumbnails, and outlines

**Note:** Results are cached, so re-analyzing the same channel within 1 hour will be much faster!

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **APIs**:
  - YouTube Data API v3
  - OpenAI API (GPT-4o-mini)
  - NewsAPI
  - Reddit JSON API

## Project Structure

```
tubeai-app/
├── app/
│   ├── api/
│   │   └── analyze-stream/
│   │       └── route.ts          # Streaming API route
│   ├── lib/
│   │   ├── youtube-service.ts    # YouTube API functions (with caching)
│   │   ├── ai-service.ts         # OpenAI functions (with caching)
│   │   └── external-apis.ts      # News & Reddit APIs
│   ├── utils/
│   │   ├── youtube.ts            # YouTube URL parsing
│   │   ├── cache.ts              # Caching utilities
│   │   └── rateLimit.ts          # Rate limiting
│   ├── types.ts                  # TypeScript type definitions
│   ├── page.tsx                  # Main UI component (with streaming)
│   └── layout.tsx                # Root layout
├── .env.local                    # Environment variables (create this)
└── package.json
```

## Deployment on Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard:
     - `YOUTUBE_API_KEY`
     - `OPENAI_API_KEY`
     - `NEWS_API_KEY` (optional)
   - Deploy!

3. **Configure GitHub Repository**
   - Share the repository with `awh@tubeai.app` as requested

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI analysis |
| `NEWS_API_KEY` | No | NewsAPI key (optional, news fetching will be skipped if not provided) |

