# X2IG - Upcoming Tasks

## Priority Tasks

### 1. Migrate from Railway to Free Alternatives
**Goal:** Eliminate Railway trial dependency

- [ ] Replace Railway Redis with **Upstash** (free tier: 10K commands/day)
- [ ] Replace Railway Worker with **Render.com** (free tier: 750 hrs/month)
- [ ] Update environment variables
- [ ] Test job queue and worker functionality
- [ ] Update documentation

### 2. Enhanced Tweet Pagination & Filtering
**Goal:** Give users more control over tweet selection

- [ ] Add "tweets per page" selector (10, 20, 50, 100)
- [ ] Add date range filter (from date - to date)
- [ ] Add "Load More" button or infinite scroll
- [ ] Remember user preferences in localStorage
- [ ] Update API to support date range filtering

### 3. Fix Screenshot Preview
**Goal:** Preview currently broken on Vercel (Playwright doesn't work in serverless)

Options to explore:
- [ ] Option A: Use Cloudinary transformations for preview (no Playwright needed)
- [ ] Option B: Generate preview via worker and return URL
- [ ] Option C: Use a screenshot API service (e.g., ScreenshotOne, Urlbox)
- [ ] Option D: Show a CSS-only preview (approximate, no actual screenshot)

### 4. Firebase Push Notifications
**Goal:** Notify users when posts are ready/published

- [ ] Create Firebase project
- [ ] Add Firebase credentials to environment
- [ ] Set up service worker for web push
- [ ] Test notifications on web
- [ ] Add notification preferences in Settings

### 5. Email Notifications (Resend)
**Goal:** Email users when posts are ready/published

- [ ] Create Resend account
- [ ] Add Resend API key to environment
- [ ] Design email templates
- [ ] Test email delivery
- [ ] Add email preferences in Settings

### 6. Instagram Token Refresh Monitoring
**Goal:** Ensure tokens don't expire unexpectedly

- [ ] Set up cron job to check token expiry daily
- [ ] Send notification when token expires in < 7 days
- [ ] Add token status indicator in Settings page
- [ ] Auto-refresh tokens when possible

### 7. Error Notifications
**Goal:** Alert user when posts fail

- [ ] Send push/email notification on post failure
- [ ] Include error reason in notification
- [ ] Link to retry from notification

### 8. Retry Failed Posts UI
**Goal:** Easy way to retry failed posts from the app

- [ ] Add "Retry" button on failed post cards
- [ ] Show error message on failed posts
- [ ] Bulk retry option for multiple failed posts

### 9. Auto-Cleanup Old Posts
**Goal:** Keep database clean

- [ ] Add setting for retention period (7, 30, 90 days)
- [ ] Cron job to delete completed posts older than retention
- [ ] Option to keep failed posts longer for debugging
- [ ] Clean up Cloudinary images for deleted posts

---

## Future Enhancements

- [ ] Support for tweet threads
- [ ] Support for tweets with media/images
- [ ] More theme options
- [ ] Custom theme creator
- [ ] Analytics dashboard (posts published, engagement)
- [ ] Multiple Instagram accounts
- [ ] Horizontal worker scaling

---

## Completed

- [x] Instagram auto-posting
- [x] Production deployment (Vercel + Railway)
- [x] Cloudinary integration
- [x] Basic tweet pagination
- [x] Instagram OAuth & token refresh
- [x] BullMQ job queue
- [x] Playwright screenshot generation
