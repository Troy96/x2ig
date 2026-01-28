import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { captureTweetScreenshot, Theme } from '../lib/screenshot'
import { uploadImage } from '../lib/cloudinary'
import { sendPushNotification } from '../lib/notifications'
import { sendEmailNotification } from '../lib/email'
import { redisConnection } from '../lib/queue'
import { publishImageToInstagram } from '../lib/instagram'

const prisma = new PrismaClient()

interface ScreenshotJobData {
  scheduledPostId: string
  tweetId: string
  userId: string
  theme: Theme
  tweetUrl: string
}

async function processScreenshotJob(job: Job<ScreenshotJobData>) {
  const { scheduledPostId, userId, theme, tweetUrl } = job.data

  console.log(`Processing job ${job.id} for scheduled post ${scheduledPostId}`)

  try {
    // Get the scheduled post details first
    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: {
        tweet: true,
        user: {
          include: {
            instagramAccount: true,
          },
        },
      },
    })

    if (!scheduledPost) {
      throw new Error(`Scheduled post ${scheduledPostId} not found`)
    }

    // Update status to processing
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'PROCESSING' },
    })

    // Capture screenshot with tweet data
    console.log(`Capturing screenshot for tweet: ${tweetUrl}`)
    const screenshot = await captureTweetScreenshot(tweetUrl, theme, {
      text: scheduledPost.tweet.text,
      authorName: scheduledPost.tweet.authorName,
      authorUsername: scheduledPost.tweet.authorUsername,
      authorImage: scheduledPost.tweet.authorImage,
      createdAt: scheduledPost.tweet.createdAt,
    })

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...')
    const uploadResult = await uploadImage(screenshot.buffer, `x2ig/${userId}`)

    let instagramPostId: string | null = null
    let postedAt: Date | null = null

    // Handle POST type - auto-post to Instagram
    if (scheduledPost.postType === 'POST') {
      const instagramAccount = scheduledPost.user.instagramAccount

      if (!instagramAccount) {
        throw new Error('No Instagram account connected for auto-posting')
      }

      // Check if token is expired
      if (new Date() > instagramAccount.tokenExpiresAt) {
        throw new Error('Instagram access token has expired. Please reconnect your account.')
      }

      console.log(`Auto-posting to Instagram for user @${instagramAccount.username}...`)

      try {
        const result = await publishImageToInstagram(
          instagramAccount.accessToken,
          instagramAccount.instagramUserId,
          uploadResult.url,
          // Optional: Use tweet text as caption (truncated if needed)
          scheduledPost.tweet.text.slice(0, 2200) // Instagram caption limit
        )

        instagramPostId = result.mediaId
        postedAt = new Date()
        console.log(`Successfully posted to Instagram! Media ID: ${instagramPostId}`)

        if (result.permalink) {
          console.log(`Permalink: ${result.permalink}`)
        }
      } catch (igError) {
        console.error('Instagram publishing failed:', igError)
        throw new Error(`Instagram publishing failed: ${igError instanceof Error ? igError.message : 'Unknown error'}`)
      }
    }

    // Update post with screenshot URL and Instagram details
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'COMPLETED',
        screenshotUrl: uploadResult.url,
        notifiedAt: new Date(),
        ...(instagramPostId && { instagramPostId }),
        ...(postedAt && { postedAt }),
      },
      include: {
        tweet: true,
        user: true,
      },
    })

    // Determine notification content based on post type
    const isAutoPosted = scheduledPost.postType === 'POST' && instagramPostId
    const notificationTitle = isAutoPosted
      ? 'Posted to Instagram!'
      : 'Your Instagram Story is Ready!'
    const notificationBody = isAutoPosted
      ? `Your post "${updatedPost.tweet.text.slice(0, 50)}..." has been published to Instagram`
      : `Screenshot for "${updatedPost.tweet.text.slice(0, 50)}..." is ready to post`

    // Get user's FCM tokens
    const fcmTokens = await prisma.fcmToken.findMany({
      where: { userId },
    })

    // Send push notification
    if (fcmTokens.length > 0) {
      console.log('Sending push notification...')
      for (const token of fcmTokens) {
        try {
          await sendPushNotification({
            token: token.token,
            title: notificationTitle,
            body: notificationBody,
            imageUrl: uploadResult.url,
            data: {
              postId: scheduledPostId,
              type: isAutoPosted ? 'POST_PUBLISHED' : 'POST_READY',
            },
          })
        } catch (err) {
          console.error('Failed to send push notification:', err)
        }
      }
    }

    // Send email notification
    if (updatedPost.user.email) {
      console.log('Sending email notification...')
      try {
        await sendEmailNotification({
          to: updatedPost.user.email,
          subject: notificationTitle,
          tweetText: updatedPost.tweet.text,
          imageUrl: uploadResult.url,
        })
      } catch (err) {
        console.error('Failed to send email notification:', err)
      }
    }

    // Create notification record
    await prisma.notification.create({
      data: {
        userId,
        type: 'POST_READY',
        title: isAutoPosted ? 'Posted to Instagram' : 'Story Ready',
        body: notificationBody,
        imageUrl: uploadResult.url,
        postId: scheduledPostId,
      },
    })

    console.log(`Job ${job.id} completed successfully`)
    return { success: true, screenshotUrl: uploadResult.url }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error)

    // Update status to failed
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    // Create failure notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'POST_FAILED',
        title: 'Screenshot Failed',
        body: 'Failed to generate your Instagram story screenshot',
        postId: scheduledPostId,
      },
    })

    throw error
  }
}

// Create worker
const worker = new Worker<ScreenshotJobData>(
  'screenshot-jobs',
  processScreenshotJob,
  {
    connection: redisConnection,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, // 5 jobs per minute
    },
  }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

console.log('Screenshot worker started')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})

export { worker }
