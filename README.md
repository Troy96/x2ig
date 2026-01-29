# X2IG - X (Twitter) to Instagram Story Converter

A web application that converts X (Twitter) posts into beautifully styled screenshots and auto-posts them to Instagram.

## Features

- **X OAuth Login** - Authenticate with your X/Twitter account
- **Tweet Dashboard** - View and filter your recent tweets
- **Custom Themes** - 5 gradient themes with auto-selection based on day
- **Preview Generation** - See how your post will look before scheduling
- **Scheduling** - Schedule posts for specific dates/times
- **Instagram Auto-Posting** - Automatically post to Instagram at scheduled time
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
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://127.0.0.1:3000"
NEXTAUTH_SECRET="your-secret-key"

# Twitter/X OAuth 2.0
TWITTER_CLIENT_ID="your-client-id"
TWITTER_CLIENT_SECRET="your-client-secret"
TWITTER_BEARER_TOKEN="your-bearer-token"

# Redis
REDIS_URL="redis://localhost:6379"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Instagram
INSTAGRAM_APP_ID="your-app-id"
INSTAGRAM_APP_SECRET="your-app-secret"
INSTAGRAM_REDIRECT_URI="http://localhost:3000/api/instagram/callback"
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

# Run worker (separate terminal)
npm run worker
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

## Development Documentation

See [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) for detailed technical challenges and solutions encountered during development.

## License

MIT

## Author

Tuhin Roy
