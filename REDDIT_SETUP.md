# Reddit OAuth API Setup Guide

## Why Reddit OAuth?

Reddit's public JSON API is often blocked by IP ranges (like Vercel's serverless functions). Using Reddit's official OAuth API provides:
- ✅ Reliable access from any server
- ✅ Higher rate limits
- ✅ Better API stability
- ✅ No IP blocking issues

## Step-by-Step Setup

### 1. Create a Reddit App

1. **Go to Reddit Apps**: https://www.reddit.com/prefs/apps
2. **Scroll down** and click **"create another app"** or **"create app"**
3. **Fill in the form**:
   - **Name**: `TubeAI` (or any name you prefer)
   - **App type**: Select **"script"** (this is important!)
   - **Description**: `YouTube content ideas generator` (optional)
   - **About URL**: Leave blank (optional)
   - **Redirect URI**: `http://localhost:3000` (required field, but not used for script apps)
4. **Click "create app"**

### 2. Get Your Credentials

After creating the app, you'll see your app details:

- **Client ID**: 
  - Located directly under your app name
  - Looks like: `abc123def456ghi789`
  - This is your `REDDIT_CLIENT_ID`

- **Client Secret**: 
  - Located in the "secret" field
  - Looks like: `xyz789_secret_abc123def456`
  - This is your `REDDIT_CLIENT_SECRET`

### 3. Set Your User Agent

Reddit requires a User-Agent header in the format:
```
TubeAI/1.0 by /u/yourusername
```

Replace `yourusername` with your actual Reddit username.

**Example**: If your Reddit username is `johndoe`, your User-Agent would be:
```
TubeAI/1.0 by /u/johndoe
```

### 4. Add to Environment Variables

Add these to your `.env.local` file:

```env
REDDIT_CLIENT_ID=abc123def456ghi789
REDDIT_CLIENT_SECRET=xyz789_secret_abc123def456
REDDIT_USER_AGENT=TubeAI/1.0 by /u/yourusername
```

### 5. Deploy to Vercel

When deploying to Vercel, add the same environment variables in the Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add all three Reddit variables

## How It Works

1. **OAuth Token**: The app automatically gets an OAuth access token using the "client credentials" flow
2. **Token Caching**: Tokens are cached (in Vercel KV if available) to avoid unnecessary requests
3. **Automatic Refresh**: Tokens are automatically refreshed when they expire
4. **API Calls**: All Reddit API calls use the OAuth token for authentication

## Troubleshooting

### "Reddit OAuth token not available"
- Check that `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are set correctly
- Verify your Reddit app type is set to "script"
- Check Vercel function logs for detailed error messages

### "401 Unauthorized"
- Verify your `REDDIT_USER_AGENT` format is correct: `TubeAI/1.0 by /u/yourusername`
- Make sure you're using your actual Reddit username (not a display name)

### "No Reddit posts found"
- This might be normal if there are no recent discussions on the topics
- Check Vercel logs to see if there are API errors
- Verify the topics being searched are relevant

## Rate Limits

Reddit OAuth API has generous rate limits:
- **60 requests per minute** per OAuth token
- Our implementation caches tokens, so you won't hit limits easily
- If you do hit limits, tokens are cached and reused efficiently

## Security Notes

- **Never commit** your `.env.local` file to git (it's already in `.gitignore`)
- **Keep your Client Secret** secure
- The OAuth token is only used server-side and never exposed to clients

