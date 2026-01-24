import { Queue, Job } from 'bullmq'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Parse Redis URL into connection options
function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  }
}

const connection = parseRedisUrl(redisUrl)

export const screenshotQueue = new Queue('screenshot-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
})

export interface ScreenshotJobData {
  scheduledPostId: string
  tweetId: string
  userId: string
  theme: 'SHINY_PURPLE' | 'MANGO_JUICE'
  tweetUrl: string
}

export async function addScreenshotJob(
  data: ScreenshotJobData,
  scheduledFor: Date
): Promise<Job<ScreenshotJobData>> {
  const delay = Math.max(0, scheduledFor.getTime() - Date.now())

  return screenshotQueue.add('process-screenshot', data, {
    delay,
    jobId: `screenshot-${data.scheduledPostId}`,
  })
}

export async function removeScreenshotJob(scheduledPostId: string): Promise<void> {
  const job = await screenshotQueue.getJob(`screenshot-${scheduledPostId}`)
  if (job) {
    await job.remove()
  }
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    screenshotQueue.getWaitingCount(),
    screenshotQueue.getActiveCount(),
    screenshotQueue.getCompletedCount(),
    screenshotQueue.getFailedCount(),
    screenshotQueue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

export { connection as redisConnection }
