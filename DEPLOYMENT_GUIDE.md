# Deployment Guide - Standalone Applications

This guide explains how to deploy the two standalone applications to Vercel.

## Overview

You now have **two separate standalone applications**:

1. **portal-standalone/** - Client-facing AI Course Builder Portal
   - URL: `https://your-portal-name.vercel.app`
   - For: External clients to submit course requests

2. **coursebuilder-standalone/** - Internal Course Builder Tool
   - URL: `https://your-coursebuilder-name.vercel.app`
   - For: Internal team to build SCORM courses

## Deployment Steps

### Step 1: Push to GitHub

First, commit and push the new standalone folders to your GitHub repository:

```bash
cd c:\Users\david\OneDrive\Documents\Desktop\bolt-last\project
git add ..
git commit -m "Add standalone portal and coursebuilder apps"
git push
```

### Step 2: Deploy Portal (Client-Facing)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** > **"Project"**
3. Select your GitHub repository
4. **IMPORTANT**: Set **Root Directory** to `portal-standalone`
5. Framework Preset: **Vite**
6. Add Environment Variables (if needed):
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click **Deploy**
8. Note the URL (e.g., `ai-course-builder-portal.vercel.app`)

### Step 3: Deploy CourseBuilder (Internal)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** > **"Project"**
3. Select the **same** GitHub repository
4. **IMPORTANT**: Set **Root Directory** to `coursebuilder-standalone`
5. Framework Preset: **Vite**
6. Add Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_ANTHROPIC_API_KEY` = your Anthropic API key
7. Click **Deploy**
8. Note the URL (e.g., `ai-course-builder-internal.vercel.app`)

## Security Notes

- **Portal**: Share this URL with clients
- **CourseBuilder**: Keep this URL private (internal team only)
- Consider adding password protection to CourseBuilder via Vercel's settings

## Local Development

To run locally:

### Portal
```bash
cd portal-standalone
npm install
npm run dev
```

### CourseBuilder
```bash
cd coursebuilder-standalone
npm install
npm run dev
```

## Folder Structure

```
bolt-last/
├── project/                    # Original combined app (can keep for reference)
├── portal-standalone/          # Client-facing portal
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AICourseBuilderPortal.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json
│   └── index.html
└── coursebuilder-standalone/   # Internal course builder
    ├── src/
    │   ├── App.tsx
    │   ├── CourseBuilder.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vercel.json
    └── index.html
```

## Next Steps After Deployment

1. **Test both apps** to ensure they work independently
2. **Set up custom domains** when ready (Vercel Settings > Domains)
3. **Add Supabase authentication** for real user management
4. **Configure email notifications** with Resend or similar

## Troubleshooting

### 404 Errors on Routes
The `vercel.json` file in each project handles SPA routing. If you see 404 errors, ensure this file exists.

### Build Errors
Run `npm install` locally first to verify dependencies are correct.

### Environment Variables
Make sure all required environment variables are set in Vercel's project settings.
