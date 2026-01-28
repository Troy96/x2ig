# Implementation Plan: Schedule Button with Instagram API Integration

> **Issue #5**: Implement the Schedule button and decide what happens next
>
> **Status**: Instagram OAuth complete, auto-posting pending
> **Created**: 2026-01-25
> **Updated**: 2026-01-27

## Overview
Implement a complete scheduling system with two posting modes:
- **Story**: Queue for manual posting (download + mark as posted)
- **Post**: Auto-post to Instagram via Instagram Graph API

## Requirements Summary

### User Flow
1. User clicks Schedule button on a tweet
2. Chooses format: **Story** or **Post**
3. Sees day-based presets ('Today', 'Tomorrow', 'This weekend', 'Next week') + custom date/time picker
4. Confirms scheduling

### Scheduled Posts Management
- Full CRUD: edit, reschedule, delete, mark as posted
- Different behavior per type:
  - **Story**: Download button for manual posting
  - **Post**: Auto-posted via Instagram API

### Instagram Integration
- **Instagram Graph API** for feed posts (Stories cannot be auto-posted via API)
- **Important**: Only Business/Creator accounts can use the API (Personal accounts cannot)
- OAuth flow for account connection
- Connect via Settings page OR when first attempting auto-post

---

## Instagram API Key Details

### Account Requirements
- **Personal accounts cannot post via API** - hard limitation
- **Business accounts** - Full API support
- **Creator accounts** - Can publish posts and Reels

### Required OAuth Scopes
```
instagram_business_basic           - Basic profile access
instagram_business_content_publish - Publishing capability
```

### Token Lifecycle
| Token Type | Validity | Action |
|------------|----------|--------|
| Short-lived | ~1 hour | Exchange immediately for long-lived |
| Long-lived | 60 days | Refresh before expiration |
| Refreshed | 60 days | Continue refreshing |

### Publishing Flow
1. **Create container**: `POST /{ig_user_id}/media` with image URL
2. **Check status**: `GET /{container_id}?fields=status_code` (poll until FINISHED)
3. **Publish**: `POST /{ig_user_id}/media_publish` with container ID
4. **Get permalink**: `GET /{media_id}?fields=permalink`

### Rate Limits
- **25 posts per 24-hour rolling window** per account
- ~200 API calls per user per hour

---

## Current State Analysis

### Existing Components
| Component | File | Status |
|-----------|------|--------|
| ScheduleModal | `src/components/ScheduleModal.tsx` | Exists - needs modification |
| BulkScheduleModal | `src/components/BulkScheduleModal.tsx` | Exists - needs modification |
| Settings page | `src/app/settings/page.tsx` | Exists - needs Instagram section |
| Schedule API | `src/app/api/schedule/route.ts` | Exists - needs postType support |
| ScheduledPost model | `prisma/schema.prisma` | Exists - needs new fields |

### Missing Components
| Component | Status |
|-----------|--------|
| Scheduled Posts page/view | **NOT EXISTS** |
| Instagram OAuth flow | **NOT EXISTS** |
| Instagram posting API | **NOT EXISTS** |
| Format selection UI | **NOT EXISTS** |
| Day-based presets | **NOT EXISTS** |

---

## Implementation Plan

### Phase 1: Database Schema Updates

**File:** `prisma/schema.prisma`

Add new fields to ScheduledPost:
```prisma
model ScheduledPost {
  // ... existing fields
  postType        PostType  @default(STORY)  // NEW: STORY or POST
  instagramPostId String?                     // NEW: IG post ID after publishing
  postedAt        DateTime?                   // NEW: When actually posted
}

enum PostType {
  STORY
  POST
}
```

Add Instagram account model:
```prisma
model InstagramAccount {
  id              String   @id @default(cuid())
  userId          String   @unique
  instagramUserId String
  username        String
  accessToken     String   // Encrypted
  tokenExpiresAt  DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Phase 2: Modify ScheduleModal

**File:** `src/components/ScheduleModal.tsx`

Changes:
1. Add format selection step (Story vs Post)
2. Add day-based presets before custom picker
3. Show Instagram connection prompt for Post type if not connected

New UI flow:
```
[Step 1: Format Selection]
┌─────────────────────────────────────┐
│  How do you want to post this?      │
│                                     │
│  ┌─────────┐    ┌─────────┐        │
│  │  Story  │    │  Post   │        │
│  │ Manual  │    │  Auto   │        │
│  └─────────┘    └─────────┘        │
└─────────────────────────────────────┘

[Step 2: Date Selection]
┌─────────────────────────────────────┐
│  When should we schedule this?      │
│                                     │
│  [Today] [Tomorrow] [Weekend] [Next]│
│                                     │
│  Or pick a specific time:           │
│  [Date picker] [Time picker]        │
└─────────────────────────────────────┘

[Step 3: Theme + Preview] (existing)
```

### Phase 3: Instagram OAuth Integration

**New Files:**
- `src/app/api/instagram/auth/route.ts` - OAuth initiation
- `src/app/api/instagram/callback/route.ts` - OAuth callback
- `src/lib/instagram.ts` - Instagram API utilities

**OAuth Endpoints:**
```
Authorization:
https://api.instagram.com/oauth/authorize
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=instagram_business_basic,instagram_business_content_publish
  &response_type=code

Token Exchange:
POST https://api.instagram.com/oauth/access_token

Long-Lived Token:
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={SECRET}
  &access_token={SHORT_TOKEN}

Token Refresh:
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={LONG_TOKEN}
```

**Flow:**
1. User clicks "Connect Instagram" in Settings or Schedule modal
2. Redirect to Instagram OAuth
3. Callback exchanges code for short-lived token
4. Immediately exchange for long-lived token (60 days)
5. Store encrypted token in InstagramAccount table
6. Set up token refresh job (refresh tokens expiring within 7 days)

**Environment Variables Needed:**
```
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/instagram/callback
TOKEN_ENCRYPTION_KEY=  # For encrypting stored access tokens
```

### Phase 4: Settings Page - Instagram Connection

**File:** `src/app/settings/page.tsx`

Add new section in Account area:
```tsx
// Instagram Account Connection
<div className="flex items-center justify-between p-4 theme-card rounded-xl border">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <Instagram className="w-5 h-5 text-white" />
    </div>
    <div>
      <h3 className="font-medium">Instagram Account</h3>
      <p className="text-sm theme-muted">
        {instagramAccount ? `@${instagramAccount.username}` : 'Not connected'}
      </p>
    </div>
  </div>
  {instagramAccount ? (
    <span className="px-3 py-1 bg-[var(--success-muted)] text-[var(--success-text)] text-sm rounded-full">
      Connected
    </span>
  ) : (
    <button onClick={connectInstagram} className="...">
      Connect
    </button>
  )}
</div>
```

### Phase 5: Scheduled Posts Management Page

**New File:** `src/app/scheduled/page.tsx`

Features:
- List all scheduled posts with status badges
- Filter by status (Pending, Completed, Failed)
- Filter by type (Story, Post)
- Actions per post:
  - **Story (Pending)**: Edit, Reschedule, Delete, Download, Mark as Posted
  - **Post (Pending)**: Edit, Reschedule, Delete
  - **Completed**: View on Instagram (for Posts), Download (for Stories)
  - **Failed**: Retry, Delete

**New File:** `src/components/ScheduledPostCard.tsx`

Card component showing:
- Tweet preview thumbnail
- Scheduled date/time
- Post type badge (Story/Post)
- Status badge (Pending/Processing/Completed/Failed)
- Action buttons

### Phase 6: Instagram Auto-Posting Worker

**File:** `src/workers/scheduler.ts` (modify)

Add Instagram posting logic:
```typescript
if (post.postType === 'POST') {
  // 1. Get user's Instagram account
  // 2. Upload image to Instagram container
  // 3. Publish the container
  // 4. Store instagramPostId
  // 5. Update status to COMPLETED
}
```

**New File:** `src/lib/instagram.ts`

Functions:
- `createMediaContainer(accessToken, imageUrl, caption)` - Upload image
- `publishMedia(accessToken, containerId)` - Publish to feed
- `refreshAccessToken(refreshToken)` - Token refresh

### Phase 7: API Updates

**File:** `src/app/api/schedule/route.ts`

Updates:
- POST: Accept `postType` field
- GET: Return `postType` in response
- Add PATCH endpoint for editing scheduled posts

**New File:** `src/app/api/schedule/[id]/route.ts`

- GET: Single post details
- PATCH: Update scheduled post (reschedule, change theme)
- DELETE: Cancel/delete post

**New File:** `src/app/api/instagram/account/route.ts`

- GET: Get connected Instagram account
- DELETE: Disconnect Instagram account

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/app/scheduled/page.tsx` | Scheduled posts management page |
| `src/components/ScheduledPostCard.tsx` | Individual scheduled post card |
| `src/app/api/instagram/auth/route.ts` | Instagram OAuth initiation |
| `src/app/api/instagram/callback/route.ts` | Instagram OAuth callback |
| `src/app/api/instagram/account/route.ts` | Get/disconnect Instagram account |
| `src/app/api/schedule/[id]/route.ts` | Single post CRUD (GET, PATCH, DELETE) |
| `src/lib/instagram.ts` | Instagram API utilities |
| `src/workers/tokenRefresh.ts` | Token refresh cron job |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add PostType enum, InstagramAccount model, new ScheduledPost fields |
| `src/components/ScheduleModal.tsx` | Add format selection (Story/Post) + day-based presets |
| `src/components/BulkScheduleModal.tsx` | Add format selection + presets |
| `src/app/settings/page.tsx` | Add Instagram connection UI in Account section |
| `src/app/api/schedule/route.ts` | Accept and return postType field |
| `src/workers/scheduler.ts` | Add Instagram publishing logic for POST type |
| `src/components/Header.tsx` | Add navigation link to /scheduled page |

---

## Verification Plan

### Manual Testing
1. **Schedule Flow**: Click Schedule → Select Story/Post → Choose preset/custom date → Confirm
2. **Instagram Connection**: Settings → Connect Instagram → Complete OAuth → Verify connected
3. **Scheduled Posts Page**: View list → Filter by status/type → Test all actions
4. **Auto-Post**: Schedule a Post type → Wait for scheduled time → Verify posted to Instagram
5. **Story Flow**: Schedule a Story → Download → Mark as posted

### Database Verification
```sql
-- Check scheduled posts
SELECT id, postType, status, scheduledFor FROM "ScheduledPost" WHERE userId = '...';

-- Check Instagram connection
SELECT username, tokenExpiresAt FROM "InstagramAccount" WHERE userId = '...';
```

---

## Implementation Order

### Step 1: Database Schema Updates
- Add `PostType` enum (STORY, POST)
- Add `InstagramAccount` model
- Add new fields to `ScheduledPost`
- Run migration

### Step 2: Scheduled Posts Page
- Create `/scheduled` page with list view
- Add filters (status, type)
- Add action buttons (edit, delete, mark posted)
- This works with existing data immediately

### Step 3: ScheduleModal Modifications
- Add format selection (Story/Post) as first step
- Add day-based presets ('Today', 'Tomorrow', 'This weekend', 'Next week')
- Keep existing theme selection + preview

### Step 4: Instagram OAuth + Settings
- Create Meta Developer App (manual step - needs Facebook Business verification)
- Implement OAuth flow endpoints
- Add Instagram connection UI to Settings
- Add token refresh mechanism

### Step 5: Auto-Posting Implementation
- Update worker to handle POST type
- Implement Instagram publishing flow
- Add status tracking (PUBLISHING → PUBLISHED)

### Step 6: Polish & Error Handling
- Add rate limit tracking
- Token expiration warnings
- Retry failed posts
- Success/failure notifications

---

## Prerequisites (Manual Setup)

Before Instagram API can work, you must:
1. Create a Meta Developer App at developers.facebook.com
2. Add Instagram Graph API product
3. Complete Facebook Business Verification (can take days)
4. Configure OAuth redirect URIs
5. Get App ID and App Secret

This order allows incremental testing - Steps 1-3 can be built and tested without waiting for Meta approval.

---

## Implementation Progress

### Completed (2026-01-27)
- [x] Phase 1: Database Schema Updates
- [x] Phase 2: ScheduleModal with Story/Post selection + day presets
- [x] Phase 3: Instagram OAuth Integration
- [x] Phase 4: Settings Page - Instagram Connection UI
- [x] Phase 5: Scheduled Posts Management Page

### Completed (2026-01-28)
- [x] **Auto-posting worker** - `src/workers/scheduler.ts` now checks postType and auto-posts to Instagram for POST type
- [x] **Instagram API lib** - `src/lib/instagram.ts` with createMediaContainer, waitForContainerReady, publishMedia, refreshAccessToken
- [x] **Token refresh mechanism** - `src/workers/tokenRefresh.ts` refreshes tokens expiring within 7 days

### Remaining TODOs
- [ ] **Set up cron job** - Schedule tokenRefresh.ts to run daily (e.g., via Railway cron or separate service)
- [ ] **Test auto-posting** - End-to-end test with a real Instagram Business/Creator account

---

## Challenges & Solutions: Instagram Login Setup

Setting up Instagram OAuth was challenging due to Meta's complex and frequently changing developer portal. Here's what we encountered and how we solved it:

### Challenge 1: Phone Verification for Developer Account
**Problem:** Meta required phone verification through Account Center, but the path was unclear.
**Solution:** Navigate through Facebook Settings → Personal and Account Information → Contact Info, or use the mobile app for faster sync.

### Challenge 2: Finding OAuth Redirect URI Settings
**Problem:** Couldn't find where to add redirect URIs for Instagram OAuth.
**Solution:** Add the redirect URI in **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** (not in a separate Instagram section).

### Challenge 3: HTTPS Required for Redirect URIs
**Problem:** Meta requires HTTPS for all redirect URIs, but localhost is HTTP.
**Solution:** Use **ngrok** to create an HTTPS tunnel: `ngrok http 3000` gives a URL like `https://abc123.ngrok-free.app`

### Challenge 4: Invalid Scopes Error
**Problem:** Got "Invalid Scopes" error for `instagram_basic`, `instagram_content_publish`.
**Solution:** Use the new Instagram Platform API (July 2024) with scopes:
- `instagram_business_basic`
- `instagram_business_content_publish`

And use `https://www.instagram.com/oauth/authorize` endpoint instead of Facebook's OAuth endpoint.

### Challenge 5: "Invalid platform app" Error
**Problem:** OAuth flow started but failed with "Invalid platform app".
**Solution:** Add **"Instagram API with Instagram Login"** as a product in Meta Developer Portal (separate from regular Instagram Graph API).

### Challenge 6: "Insufficient Developer Role" Error
**Problem:** Could log in to Instagram but got role error.
**Solution:**
1. Link Instagram and Facebook accounts in **Meta Account Center**
2. Add redirect URI under **"setup instagram business login"** section (not Facebook Login)
3. Switch app from **Development** to **Live** mode

### Challenge 7: App Requires Privacy Policy for Live Mode
**Problem:** Couldn't switch to Live mode without a valid Privacy Policy URL.
**Solution:** Created `/privacy` page in the app and used the ngrok URL: `https://xxx.ngrok-free.app/privacy`

### Challenge 8: NextAuth Cookies Not Working with HTTPS
**Problem:** OAuth state cookie was missing when using ngrok HTTPS URL.
**Solution:** Update `src/lib/auth.ts` to set `secure: true` dynamically:
```typescript
secure: process.env.NEXTAUTH_URL?.startsWith('https')
```

### Challenge 9: Redirect After OAuth Goes to localhost
**Problem:** After successful OAuth, redirect went to `localhost:3000` instead of ngrok URL.
**Solution:** Use `process.env.NEXTAUTH_URL` as base URL for redirects in callback route instead of `request.url`.

### Key Learnings
1. **Use the new Instagram Platform API** (July 2024) - it's simpler and doesn't require Facebook Page connection
2. **ngrok is essential** for local development with Meta OAuth (HTTPS requirement)
3. **Meta's portal changes frequently** - documentation may be outdated
4. **App must be in Live mode** for OAuth to work properly with your own account
5. **Instagram and Facebook accounts must be linked** in Meta Account Center
