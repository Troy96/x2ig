# X2IG - X (Twitter) to Instagram Story Converter

A web application that converts X (Twitter) posts into beautifully styled screenshots optimized for Instagram Stories.

## Overview

X2IG automates the process of converting your tweets into eye-catching images with custom gradient backgrounds, ready to be shared on Instagram Stories. Simply login with your X account, select tweets, and generate styled screenshots instantly.

## Features

- **X OAuth Login** - Authenticate with your X/Twitter account
- **Tweet Dashboard** - View and filter your recent tweets (all/unposted)
- **Custom Themes** - Two gradient themes:
  - **Shiny Purple** - Purple gradient (weekdays default)
  - **Mango Juice** - Pink/orange gradient (Sunday default)
- **Auto Theme Selection** - Automatically picks theme based on scheduled day
- **Preview Generation** - See how your post will look before scheduling
- **Scheduling** - Schedule posts for specific dates/times
- **Square Output** - 1080x1080px images perfect for Instagram

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 (Twitter OAuth 2.0) |
| Screenshot | Playwright + Custom HTML Renderer |
| Image Hosting | Cloudinary |
| Styling | Tailwind CSS |
| Job Queue | BullMQ + Redis |
| Instagram API | Instagram Graph API (Content Publishing) |

## Production Architecture

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | https://x2ig-troy96s-projects.vercel.app |
| Database | Supabase | PostgreSQL |
| Redis | Railway | Job queue for BullMQ |
| Worker | Railway | Screenshot generation + Instagram posting |
| Images | Cloudinary | Screenshot storage |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- X/Twitter Developer Account with API credentials

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://127.0.0.1:3000"
NEXTAUTH_SECRET="your-secret-key"

# Twitter/X OAuth 2.0
TWITTER_CLIENT_ID="your-client-id"
TWITTER_CLIENT_SECRET="your-client-secret"
TWITTER_BEARER_TOKEN="your-bearer-token"

# Redis (optional - for job queue)
REDIS_URL="redis://localhost:6379"
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Project Structure

```
x2ig/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Auth routes
│   │   │   ├── tweets/              # Tweet fetching
│   │   │   ├── schedule/            # Scheduling
│   │   │   └── preview/             # Screenshot generation
│   │   └── layout.tsx
│   ├── components/
│   │   ├── TweetList.tsx
│   │   ├── TweetCard.tsx
│   │   ├── ScheduleModal.tsx
│   │   └── BulkScheduleModal.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts                  # NextAuth config
│   │   ├── twitter.ts               # X API client
│   │   ├── screenshot.ts            # Screenshot engine
│   │   └── utils.ts
│   └── workers/
│       └── scheduler.ts             # Job processor (optional)
├── prisma/
│   └── schema.prisma
└── package.json
```

---

## Development Log & Technical Challenges

### Phase 1: Project Setup & Authentication

**Initial Setup:**
- Initialized Next.js 14 with TypeScript and Tailwind CSS
- Set up Prisma ORM with PostgreSQL

**Challenge: Prisma Version Compatibility**
- Initially used Prisma v7 which had compatibility issues
- **Solution:** Downgraded to Prisma v5 (`npm install prisma@5 @prisma/client@5`)

**Challenge: Supabase Connection String**
- Direct connection (port 5432) didn't work
- **Solution:** Used Session mode pooler connection:
  ```
  postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
  ```

**Challenge: Twitter OAuth "State cookie was missing" Error**
- NextAuth wasn't preserving state between OAuth redirects
- **Solution:** Added explicit cookie configuration in auth.ts:
  ```typescript
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false }
    },
    state: {
      name: 'next-auth.state',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false }
    }
  }
  ```

**Challenge: "Record to update not found" in signIn Callback**
- User record didn't exist yet when signIn callback fired
- **Solution:** Moved user update logic to `linkAccount` event instead, with fallback in session callback to fetch from Account table

**Challenge: Twitter xUserId Not Being Saved**
- The X user ID wasn't being persisted to User table
- **Solution:** Added fallback in session callback to fetch from Account table and update User record

### Phase 2: Tweet Fetching

**Challenge: Twitter API "CreditsDepleted" Error**
- Free tier Twitter API has limited credits
- **Solution:** User purchased Twitter API Basic tier ($100/month)

**Implementation:**
- Used `twitter-api-v2` library
- Fetch user's recent tweets via Bearer Token
- Cache tweets in database to reduce API calls

### Phase 3: Screenshot Engine (Major Iteration)

**Attempt 1: 10015.io Scraping**
- Initially tried to automate 10015.io's Tweet to Image Converter using Playwright
- **Problems encountered:**
  1. Cookie consent popup blocking interactions
  2. React-based input not accepting Playwright's `.fill()` method
  3. Tweet capture failing (showing "Loading" indefinitely)
  4. Theme selection not working
  5. Rate limiting/API issues on 10015.io's end

**Attempt 2: JavaScript DOM Manipulation for 10015.io**
- Used `page.evaluate()` to set input values and trigger React events:
  ```typescript
  await page.evaluate((url) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set
    nativeInputValueSetter.call(input, url)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, tweetUrl)
  ```
- **Result:** URL was entered but tweets still failed to load

**Attempt 3: Custom HTML Renderer (Final Solution)**
- Abandoned 10015.io completely
- Built our own tweet card renderer using HTML/CSS + Playwright
- **Benefits:**
  - Full control over styling
  - No third-party dependencies
  - Much faster (~500ms vs 15+ seconds)
  - Reliable and consistent output

**Final Implementation:**
```typescript
function generateTweetCardHtml(tweet: TweetData, theme: Theme): string {
  const gradient = theme === 'SHINY_PURPLE'
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f9a825 100%)'

  return `
    <html>
      <body style="background: ${gradient}; ...">
        <div class="card">
          <!-- Tweet content with avatar, name, verified badge, text -->
        </div>
      </body>
    </html>
  `
}
```

### Phase 4: Image Processing

**Challenge: Sharp Composite Error**
- "Image to composite must have same dimensions or smaller"
- **Solution:** Simplified to use `sharp.resize()` with `fit: 'contain'` instead of creating canvas + composite

**Aspect Ratio Evolution:**
1. Initially tried 9:13 for Instagram Stories
2. User preferred 1:1 square with tweet card centered
3. Final: 1080x1080 square output

### Phase 5: UI/UX Refinements

**User Feedback Iterations:**
1. Removed profile photos from TweetCard component (too cluttered)
2. Removed profile photos from ScheduleModal
3. Added profile photo back in screenshot output (user wanted it there)
4. Added blue verification badge
5. Made tweet card wider for better readability:
   - Changed from `max-width: 500px` to `width: calc(100% - 80px)`
   - Increased font sizes (tweet text: 22px)
   - Increased avatar size (56px)

### Phase 6: Scheduling System

**Initial Implementation:**
- Used BullMQ with Redis for job queue
- Jobs scheduled for future execution

**Challenge: Redis Not Running Locally**
- User didn't have Redis installed
- **Solution:** Modified schedule API to save to database without queueing:
  ```typescript
  // Queue disabled - just save to DB
  const post = await prisma.scheduledPost.create({
    data: { userId, tweetId, scheduledFor, theme, status: 'PENDING' }
  })
  ```

### Key Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| Custom renderer vs 10015.io | Reliability, speed, control over styling |
| Prisma v5 vs v7 | Compatibility with current ecosystem |
| Square (1:1) vs Portrait (9:13) | User preference for Instagram feed posts |
| Skip Redis for now | Simplify local development |
| Session mode pooler for Supabase | Direct connection was unreliable |

### Performance Metrics

| Operation | Time |
|-----------|------|
| Tweet fetch (API) | ~500-800ms |
| Screenshot generation (10015.io) | 15-20 seconds |
| Screenshot generation (custom) | ~500ms |
| Full preview flow | ~1-2 seconds |

### Phase 7: Instagram Auto-Posting & Production Deployment (Jan 2026)

#### Instagram OAuth & Auto-Posting

**Challenge: Instagram User ID Mismatch**
- Scheduled auto-posts were failing with "unexpected error" (code 2)
- Discovered the stored Instagram User ID was off by 1 from the actual ID
- **Root Cause:** OAuth callback was using `tokenData.user_id` from token exchange instead of `igUserData.id` from Graph API
- **Solution:** Fixed OAuth callback to use the Graph API's `id` field:
  ```typescript
  // Before (wrong)
  const instagramUserId = tokenData.user_id?.toString()

  // After (correct)
  const instagramUserId = igUserData.id  // From /me endpoint
  ```

**Challenge: Cloudinary Configuration**
- Initial "Invalid api_key" errors
- Cloud name was set to "Root" (account name) instead of actual cloud name
- **Solution:** Used correct cloud name from Cloudinary dashboard (e.g., "dwtlvqixy")

#### Production Deployment - Railway Attempt (Failed)

**Multiple Issues with Railway for Next.js:**

1. **Package Lock Sync Issues**
   - `npm ci` failed due to missing packages in lock file
   - **Solution:** Regenerated package-lock.json with `rm -rf node_modules package-lock.json && npm install`

2. **ESLint Build Errors**
   - Unused imports causing build failures
   - **Solution:** Removed unused imports (DayOfWeek, StoryTheme, cn, sharp, themeData)

3. **Static Generation Error**
   - Settings page using `useTheme` hook failed during pre-rendering
   - **Solution:** Split into server component (page.tsx with `export const dynamic = 'force-dynamic'`) and client component (SettingsContent.tsx)

4. **Persistent 502 Errors**
   - Container started ("Ready in 198ms") but immediately stopped
   - No useful error logs despite multiple debugging attempts
   - Tried: standalone output, different start commands, disabling health checks, adding instrumentation
   - Railway just kept stopping the container with no explanation
   - **Outcome:** Abandoned Railway for Next.js app after hours of debugging

#### Production Deployment - Vercel (Success)

**Vercel worked on first try!**

**Challenge: Callback URL Mismatch**
- Vercel creates unique URLs per deployment (e.g., `x2ig-1qzgu2vyu-troy96s-projects.vercel.app`)
- NextAuth was using deployment URL instead of production URL
- **Solution:**
  1. Use stable production URL: `x2ig-troy96s-projects.vercel.app`
  2. Set `NEXTAUTH_URL` environment variable correctly
  3. Update callback URLs in X Developer Portal and Meta Developer Portal

**Challenge: Vercel VERCEL_URL Override**
- Vercel auto-sets `VERCEL_URL` which NextAuth might prefer over `NEXTAUTH_URL`
- **Solution:** Added URL detection logic in auth.ts:
  ```typescript
  const getBaseUrl = () => {
    if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    return 'http://localhost:3000'
  }
  ```

#### Worker Deployment on Railway

**Challenge: Playwright Missing on Railway**
- Nixpacks builder doesn't include Playwright browsers
- Error: "Executable doesn't exist at /root/.cache/ms-playwright/chromium..."
- **Solution Attempt 1:** `npx playwright install chromium --with-deps` in build command
- **Failed:** Missing system libraries (libglib-2.0.so.0)

**Challenge: System Dependencies for Playwright**
- Tried nixpacks.toml with nix packages - failed with "undefined variable" errors
- **Final Solution:** Created Dockerfile.worker with all dependencies:
  ```dockerfile
  FROM node:20-slim
  RUN apt-get update && apt-get install -y \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libasound2 libpango-1.0-0 libcairo2
  ```

**Challenge: Dockerfile Build Order**
- `npm ci` running `postinstall` (prisma generate) before schema was copied
- **Solution:** Copy prisma folder before npm ci:
  ```dockerfile
  COPY package*.json ./
  COPY prisma ./prisma
  RUN npm ci
  ```

**Challenge: Worker Container Stopping**
- Worker started but container kept stopping
- **Solution:** Added error handling and keep-alive:
  ```typescript
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
  })

  setInterval(() => {
    console.log('Worker still running...', new Date().toISOString())
  }, 5 * 60 * 1000)
  ```

#### API Optimization

**Challenge: Twitter API Credits Being Depleted**
- Auto-refresh fetching 200 tweets on every page load
- **Solution:** Added pagination and manual refresh:
  ```typescript
  // Only fetch from Twitter when explicitly requested
  if (refresh) {
    const freshTweets = await fetchUserTweets(user.xUserId, Math.min(fetchCount, 100))
  }

  // Pagination support
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  ```

#### Git Configuration Fix

**Challenge: Commits Not Showing on GitHub Contributions**
- Git using auto-configured email: `roy@Tuhins-MacBook-Pro.local`
- **Solution:** Set correct email:
  ```bash
  git config user.email "troy0870@gmail.com"
  git config user.name "Tuhin Roy"
  ```

### Final Production Setup Summary

| Component | Service | Notes |
|-----------|---------|-------|
| Web App | Vercel | Auto-deploys from GitHub |
| Database | Supabase | PostgreSQL with pooler connection |
| Redis | Railway | For BullMQ job queue |
| Worker | Railway | Dockerfile with Playwright deps |
| Images | Cloudinary | Screenshot storage |

**Environment Variables Required:**

*Vercel (Web App):*
- `DATABASE_URL` - Supabase PostgreSQL
- `NEXTAUTH_URL` - Production URL
- `NEXTAUTH_SECRET` - Auth secret
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_BEARER_TOKEN`
- `REDIS_URL` - Railway Redis (public URL)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` - Production callback URL

*Railway (Worker):*
- `DATABASE_URL` - Supabase PostgreSQL
- `REDIS_URL` - Railway Redis (can use internal URL)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`

### Known Limitations

1. **No Push Notifications** - Firebase not configured
2. **No Email Notifications** - Resend not configured
3. **Preview Generation Disabled on Vercel** - Playwright doesn't work in serverless (screenshots only generated by worker)
4. **Single Worker Instance** - No horizontal scaling for worker

### Completed Features

- [x] Set up Redis for proper job queue
- [x] Add Cloudinary for image storage
- [x] Deploy to Vercel (frontend) + Railway (worker)
- [x] Instagram OAuth and auto-posting
- [x] Tweets pagination to save API credits

### Future Improvements

- [ ] Configure Firebase for push notifications
- [ ] Configure Resend for email notifications
- [ ] Add more theme options (currently 5 themes)
- [ ] Support for tweet threads
- [ ] Support for tweets with media
- [ ] Preview generation using Cloudinary transformations (instead of Playwright)
- [ ] Horizontal worker scaling

---

## License

MIT

## Author

Tuhin Roy
