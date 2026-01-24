import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { captureTweetScreenshot, Theme } from '../lib/screenshot'
import { uploadImage } from '../lib/cloudinary'
import { sendPushNotification } from '../lib/notifications'
import { sendEmailNotification } from '../lib/email'
import { redisConnection } from '../lib/queue'

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
    // Update status to processing
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'PROCESSING' },
    })

    // Capture screenshot using 10015.io
    console.log(`Capturing screenshot for tweet: ${tweetUrl}`)
    const screenshot = await captureTweetScreenshot(tweetUrl, theme)

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...')
    const uploadResult = await uploadImage(screenshot.buffer, `x2ig/${userId}`)

    // Update post with screenshot URL
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'COMPLETED',
        screenshotUrl: uploadResult.url,
        notifiedAt: new Date(),
      },
      include: {
        tweet: true,
        user: true,
      },
    })

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
            title: 'Your Instagram Story is Ready!',
            body: `Screenshot for "${updatedPost.tweet.text.slice(0, 50)}..." is ready to post`,
            imageUrl: uploadResult.url,
            data: {
              postId: scheduledPostId,
              type: 'POST_READY',
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
          subject: 'Your Instagram Story is Ready!',
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
        title: 'Story Ready',
        body: `Your screenshot is ready to post on Instagram`,
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
