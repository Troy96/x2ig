# X to Instagram Story Automation Tool - PRD

## Overview

A web application that automates the workflow of converting X (Twitter) posts into styled screenshot images and scheduling them for Instagram story posting.

## Problem Statement

As a content creator, manually converting tweets to images using 10015.io and posting to Instagram stories daily is time-consuming and repetitive. This tool automates the screenshot generation, scheduling, and notification workflow.

## User Workflow

1. User logs in via X OAuth
2. Dashboard displays recent unposted tweets
3. User selects tweets to schedule, sets date/time, and optionally overrides theme
4. System automatically captures styled screenshots at scheduled time
5. User receives push notification on mobile with the image
6. User taps notification to post to Instagram story manually

---

## Functional Requirements

### 1. Authentication

| Requirement | Details |
|-------------|---------|
| X OAuth Login | Authenticate with X to fetch user's tweets |
| Session Management | Persistent login sessions with secure token storage |

### 2. Tweet Management

| Requirement | Details |
|-------------|---------|
| Fetch Recent Tweets | Display user's recent tweets (last 50-100) |
| Track Posted Status | Mark tweets as "posted" or "unposted" to Instagram |
| Tweet Preview | Show tweet content, media, engagement stats |

### 3. Scheduling System

| Requirement | Details |
|-------------|---------|
| Date/Time Picker | Select specific date and time for each scheduled post |
| Bulk Scheduling | Select multiple tweets and schedule them all at once with individual times |
| Theme Selection | Auto-select based on day (Sunday = Mango Juice, Others = Shiny Purple) |
| Theme Override | Manual option to choose any theme regardless of day |
| Queue View | Dashboard showing all scheduled posts with status |
| Edit/Cancel | Ability to modify or cancel scheduled posts |

### 4. Screenshot Generation

| Requirement | Details |
|-------------|---------|
| Browser Automation | Use Puppeteer/Playwright to interact with 10015.io |
| Theme Application | Apply correct theme (Shiny Purple or Mango Juice) |
| Image Capture | Download generated screenshot |
| Image Processing | Resize/crop to square format (1:1 / 1080x1080) |
| Preview | Show generated screenshot preview before confirming schedule |

### 5. Notification System

| Requirement | Details |
|-------------|---------|
| Mobile Push | Send push notification with image when scheduled time arrives |
| Email Notification | Send email with image attachment as backup |
| In-App Dashboard | Show notification history and status |
| Failure Alerts | Notify if screenshot generation or delivery fails |

### 6. Dashboard

| Requirement | Details |
|-------------|---------|
| Unposted Tweets | List of tweets not yet scheduled/posted |
| Scheduled Queue | Upcoming scheduled posts with date/time |
| History | Past posts with status (success/failed) |
| Settings | Notification preferences, theme defaults |

---

## Theme Configuration

| Day | Default Theme |
|-----|---------------|
| Sunday | Mango Juice |
| Monday - Saturday | Shiny Purple |

User can override theme selection per-post.

---

## Technical Architecture

### Recommended Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14+ (App Router) |
| Backend | Next.js API Routes |
| Database | PostgreSQL (via Prisma ORM) |
| Job Queue | BullMQ with Redis |
| Browser Automation | Playwright |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Email | Resend or SendGrid |
| Authentication | NextAuth.js with X OAuth |
| Hosting | Vercel (frontend) + Railway (workers/Redis) |
| Storage | Cloudinary or AWS S3 (for processed images) |

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Next.js   │  │   Next.js   │  │     PostgreSQL      │  │
│  │  Frontend   │──│ API Routes  │──│     (Prisma)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Background Workers                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   BullMQ    │──│  Playwright │──│    Image Storage    │  │
│  │ Job Queue   │  │   Worker    │  │   (Cloudinary/S3)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Notification Services                      │
│  ┌─────────────────────┐      ┌─────────────────────────┐   │
│  │  Firebase FCM       │      │   Email (Resend)        │   │
│  │  (Mobile Push)      │      │                         │   │
│  └─────────────────────┘      └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

**users**
- id, x_user_id, x_username, x_access_token, email, fcm_token, created_at

**tweets**
- id, user_id, tweet_id, tweet_url, content, media_urls, is_posted, created_at

**scheduled_posts**
- id, user_id, tweet_id, scheduled_at, theme, status (pending/processing/completed/failed), image_url, created_at

**notifications**
- id, user_id, scheduled_post_id, type (push/email), status, sent_at

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/x` | GET | X OAuth callback |
| `/api/tweets` | GET | Fetch user's recent tweets |
| `/api/tweets/[id]/mark-posted` | POST | Mark tweet as posted |
| `/api/schedule` | GET | Get scheduled posts |
| `/api/schedule` | POST | Create new scheduled post |
| `/api/schedule/[id]` | PUT | Update scheduled post |
| `/api/schedule/[id]` | DELETE | Cancel scheduled post |
| `/api/settings` | GET/PUT | User settings |

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99% uptime |
| Screenshot Generation | < 30 seconds per image |
| Notification Delivery | Within 1 minute of scheduled time |
| Mobile Support | Responsive design for dashboard |
| Security | Encrypted tokens, HTTPS only |

---

## User Interface Mockup

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│  X2IG                                    [@username] [⚙️]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📋 Unposted Tweets                      [Refresh]         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tweet content preview...              [Schedule →]   │  │
│  │ 2h ago · 12 ❤️ · 3 🔁                                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Another tweet here...                 [Schedule →]   │  │
│  │ 5h ago · 45 ❤️ · 8 🔁                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  📅 Scheduled (3)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tweet preview...     Jan 23, 10:00 AM  [Edit] [❌]   │  │
│  │ Theme: Shiny Purple  Status: Pending                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ✅ History                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tweet preview...     Jan 22, 9:00 AM   ✅ Sent       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Schedule Modal (Single Tweet)

```
┌─────────────────────────────────────┐
│  Schedule Post                   ✕  │
├─────────────────────────────────────┤
│                                     │
│  🎨 Theme:                          │
│  ● Auto (Shiny Purple - Weekday)   │
│  ○ Shiny Purple                     │
│  ○ Mango Juice                      │
│                                     │
│       [Generate Preview]            │
│                                     │
│  Screenshot Preview (1080x1080)     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │    [Generated screenshot]     │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  📅 Date: [Jan 23, 2026      ▼]    │
│  🕐 Time: [10:00 AM          ▼]    │
│                                     │
│         [Cancel]  [Schedule]        │
└─────────────────────────────────────┘
```

### Bulk Schedule Modal

```
┌──────────────────────────────────────────────────┐
│  Bulk Schedule (3 tweets selected)            ✕  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Tweet 1: "Tweet content..."                     │
│  📅 [Jan 23, 2026] 🕐 [10:00 AM] 🎨 [Auto ▼]    │
│  [Preview]                                       │
│                                                  │
│  Tweet 2: "Another tweet..."                     │
│  📅 [Jan 23, 2026] 🕐 [2:00 PM]  🎨 [Auto ▼]    │
│  [Preview]                                       │
│                                                  │
│  Tweet 3: "Third tweet..."                       │
│  📅 [Jan 24, 2026] 🕐 [9:00 AM]  🎨 [Auto ▼]    │
│  [Preview]                                       │
│                                                  │
│         [Cancel]  [Schedule All]                 │
└──────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- Project setup (Next.js, database, auth)
- X OAuth integration
- Tweet fetching and display

### Phase 2: Screenshot Engine
- Playwright automation for 10015.io
- Theme selection logic
- Image processing for 9:16 aspect ratio

### Phase 3: Scheduling System
- Database schema for scheduled posts
- BullMQ job queue setup
- Cron-based job processing

### Phase 4: Notifications
- Firebase FCM integration for mobile push
- Email notifications with image attachment
- In-app notification history

### Phase 5: Polish & Deploy
- UI/UX refinements
- Error handling and retry logic
- Deployment to Vercel + Railway

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 10015.io changes UI/blocks automation | Build fallback screenshot generator using html2canvas |
| X API rate limits | Cache tweets, implement backoff strategy |
| Push notification delivery failures | Email as backup, retry mechanism |
| Session expiry | Refresh token handling, re-auth prompts |

---

## Success Metrics

- Screenshot generation success rate > 95%
- Notification delivery within 2 minutes of schedule
- User completes daily workflow in < 2 minutes (vs 10+ minutes manual)

---

## Resolved Decisions

- **Preview**: Yes - show generated screenshot preview before confirming schedule
- **Bulk Scheduling**: Yes - allow selecting and scheduling multiple tweets at once
- **Image Format**: Square (1:1 / 1080x1080) - not 9:16 story format
