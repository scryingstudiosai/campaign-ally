# Netlify Deployment Guide

## Quick Deploy Steps

1. **Push to GitHub** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select your repository

3. **Add Secret Environment Variable**

   After importing, go to **Site settings** → **Environment variables** → **Add a variable**

   Add this variable:
   ```
   OPENAI_API_KEY = <your-actual-openai-key>
   ```

   **IMPORTANT:** Replace the placeholder key with your real OpenAI API key.

4. **Deploy**
   - Netlify will automatically detect the `netlify.toml` configuration
   - Click "Deploy site"
   - Build should complete in 2-3 minutes

## What's Configured

The `netlify.toml` file includes:
- ✅ Next.js 14 App Router support
- ✅ Supabase environment variables (public)
- ✅ Node 18 runtime
- ✅ Automatic redirects for client-side routing
- ✅ Optimized function bundling with esbuild

## After Deployment

Your app will be available at: `https://[random-name].netlify.app`

You can customize the domain in Netlify settings.

## Troubleshooting

If build fails:
1. Check that Node version is set to 18 or higher
2. Verify all environment variables are set correctly
3. Check build logs for specific errors

For function timeouts:
- Netlify free tier: 10-second timeout
- Pro tier: 26-second timeout (recommended for AI features)
