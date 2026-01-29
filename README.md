# X2IG - X (Twitter) to Instagram Story Converter

A web application that converts X (Twitter) posts into beautifully styled screenshots and auto-posts them to Instagram.

## Features

- **X OAuth Login** - Authenticate with your X/Twitter account
- **Tweet Dashboard** - View and filter your recent tweets with pagination
- **Custom Themes** - 5 gradient themes (Shiny Purple, Mango Juice, Ocean Breeze, Forest Glow, Sunset Vibes)
- **Auto Theme Selection** - Automatically picks theme based on day of week
- **Preview Generation** - See how your post will look before scheduling
- **Single & Bulk Scheduling** - Schedule one or multiple tweets at once
- **Two Post Types**:
  - **Story** - Generate screenshot for manual posting
  - **Post** - Auto-publish directly to Instagram feed
- **Instagram Auto-Posting** - Automatically post to Instagram at scheduled time
- **Multi-channel Notifications** - Push (Firebase), Email (Resend), and in-app
- **Token Auto-Refresh** - Instagram tokens automatically refreshed before expiry
- **Square Output** - 1080x1080px images optimized for Instagram

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
| Job Queue | BullMQ + Redis |
| Instagram API | Instagram Graph API |

## Production Architecture

| Service | Platform |
|---------|----------|
| Web App | Vercel |
| Database | Supabase (PostgreSQL) |
| Redis | Railway |
| Worker | Railway (Dockerfile) |
| Images | Cloudinary |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Redis (for job queue)
- X/Twitter Developer Account
- Meta Developer Account (for Instagram)
- Cloudinary Account

### Environment Variables

Create a `.env` file:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"                    # Local dev
# NEXTAUTH_URL="https://your-domain.vercel.app"        # Production
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Twitter/X OAuth 2.0 (from developer.twitter.com)
TWITTER_CLIENT_ID="your-client-id"
TWITTER_CLIENT_SECRET="your-client-secret"
TWITTER_BEARER_TOKEN="your-bearer-token"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"                      # Local dev
# REDIS_URL="redis://default:password@host:port"       # Production (Railway)

# Cloudinary (from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Instagram (from developers.facebook.com)
INSTAGRAM_APP_ID="your-app-id"
INSTAGRAM_APP_SECRET="your-app-secret"
INSTAGRAM_REDIRECT_URI="http://localhost:3000/api/instagram/callback"    # Local dev
# INSTAGRAM_REDIRECT_URI="https://your-domain.vercel.app/api/instagram/callback"  # Production

# Optional: Push Notifications (Firebase)
# FIREBASE_PROJECT_ID="your-project-id"
# FIREBASE_CLIENT_EMAIL="your-client-email"
# FIREBASE_PRIVATE_KEY="your-private-key"

# Optional: Email Notifications (Resend)
# RESEND_API_KEY="your-api-key"
# RESEND_FROM_EMAIL="notifications@yourdomain.com"
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

# Run worker (separate terminal - required for scheduling to work)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

> **Important:** The worker process must be running for scheduled posts to be processed. It handles screenshot generation, Cloudinary upload, and Instagram auto-posting.

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production (includes prisma generate & db push) |
| `npm run start` | Start production server |
| `npm run worker` | Run background worker for job processing |
| `npm run worker:dev` | Run worker with hot reload |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create database migration |
| `npm run db:studio` | Open Prisma Studio UI |

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
│   │   │   ├── instagram/           # Instagram OAuth
│   │   │   └── preview/             # Screenshot generation
│   │   └── settings/                # Settings page
│   ├── components/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── twitter.ts
│   │   ├── instagram.ts
│   │   ├── screenshot.ts
│   │   └── queue.ts
│   └── workers/
│       ├── run.ts                   # Worker entry
│       └── scheduler.ts             # Job processor
├── prisma/
│   └── schema.prisma
├── Dockerfile.worker                # Worker container
└── package.json
```

## Deployment

### Web App (Vercel)

1. Connect GitHub repo to Vercel
2. Add environment variables
3. Deploy

### Worker (Railway)

1. Create new service from GitHub repo
2. Railway will use `Dockerfile.worker` automatically
3. Add environment variables
4. Deploy

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js authentication |
| `/api/tweets` | GET | Fetch tweets (supports pagination) |
| `/api/schedule` | GET | List scheduled posts |
| `/api/schedule` | POST | Schedule a post |
| `/api/schedule` | DELETE | Cancel a scheduled post |
| `/api/schedule/[id]/retry` | POST | Retry a failed post |
| `/api/schedule/[id]/process` | POST | Manually process a post |
| `/api/schedule/[id]/mark-posted` | POST | Mark post as manually posted |
| `/api/preview` | POST | Generate preview screenshot |
| `/api/instagram/auth` | GET | Start Instagram OAuth |
| `/api/instagram/callback` | GET | Instagram OAuth callback |
| `/api/instagram/account` | GET | Get connected Instagram account |
| `/api/instagram/account` | DELETE | Disconnect Instagram account |
| `/api/notifications` | GET | Get user notifications |
| `/api/notifications` | PATCH | Mark notifications as read |
| `/api/fcm` | POST | Register FCM token for push notifications |
| `/api/fcm` | DELETE | Unregister FCM token |
| `/api/health` | GET | Health check endpoint |

## Database Models

| Model | Purpose |
|-------|---------|
| User | Application users with X account info |
| Account | OAuth provider accounts (NextAuth) |
| Session | User sessions (NextAuth) |
| Tweet | Cached tweets from user's timeline |
| ScheduledPost | Posts scheduled for processing/publishing |
| Notification | In-app notifications |
| FcmToken | Push notification tokens |
| InstagramAccount | Connected Instagram accounts |

**Enums:**
- `Theme`: SHINY_PURPLE, MANGO_JUICE, OCEAN_BREEZE, FOREST_GLOW, SUNSET_VIBES
- `PostStatus`: PENDING, PROCESSING, COMPLETED, FAILED
- `PostType`: STORY (screenshot only), POST (auto-publish to Instagram)

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│    Vercel    │      │   Railway    │      │   Supabase   │
│   (Web App)  │─────▶│   (Worker)   │─────▶│ (PostgreSQL) │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │Cloudinary│  │ Instagram│  │ Notifications│
        │ (Images) │  │   API    │  │ (FCM/Email)  │
        └──────────┘  └──────────┘  └──────────────┘
```

**Two Post Types:**

| Type | Flow |
|------|------|
| **Story** | Schedule → Screenshot generated → Download from app → Manual upload to Instagram |
| **Post** | Schedule → Screenshot generated → Auto-published to Instagram feed |

## UI Themes vs Story Themes

The app has **two separate theme systems**:

1. **UI Theme** (3 options) - Controls app appearance
   - Midnight (dark)
   - Daylight (light)
   - Paper (warm)

2. **Story Theme** (5 options) - Controls screenshot gradient background
   - Shiny Purple
   - Mango Juice
   - Ocean Breeze
   - Forest Glow
   - Sunset Vibes

Story themes can be auto-selected based on day of week in Settings.

## Development Documentation

See [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) for detailed technical challenges and solutions encountered during development.

## License

MIT

## Author

Tuhin Roy
