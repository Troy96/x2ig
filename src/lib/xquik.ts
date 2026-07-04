import type { TweetData } from './twitter'

const XQUIK_API_BASE_URL = process.env.XQUIK_API_BASE_URL ?? 'https://xquik.com'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function numberField(record: Record<string, unknown> | undefined, keys: string[]): number {
  if (!record) return 0

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

function readTweetItems(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) {
    return []
  }

  const data = payload.data
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (isRecord(data)) {
    if (Array.isArray(data.tweets)) {
      return data.tweets.filter(isRecord)
    }

    if (Array.isArray(data.items)) {
      return data.items.filter(isRecord)
    }
  }

  if (Array.isArray(payload.tweets)) {
    return payload.tweets.filter(isRecord)
  }

  if (Array.isArray(payload.results)) {
    return payload.results.filter(isRecord)
  }

  return []
}

function mapTweet(tweet: Record<string, unknown>, fallbackUsername: string): TweetData | null {
  const id = stringField(tweet, ['id', 'tweetId'])
  const text = stringField(tweet, ['text', 'fullText', 'content'])
  if (!id || !text) {
    return null
  }

  const author = isRecord(tweet.author) ? tweet.author : {}
  const metrics = isRecord(tweet.public_metrics)
    ? tweet.public_metrics
    : isRecord(tweet.metrics)
      ? tweet.metrics
      : undefined

  return {
    id,
    text,
    created_at: stringField(tweet, ['createdAt', 'created_at']) || new Date().toISOString(),
    author: {
      id: stringField(author, ['id']) || fallbackUsername,
      name: stringField(author, ['name']) || fallbackUsername,
      username: stringField(author, ['username', 'screen_name']) || fallbackUsername,
      profile_image_url: stringField(author, ['profile_image_url', 'profileImageUrl']) || undefined,
    },
    public_metrics: {
      like_count: numberField(metrics, ['like_count', 'likes']),
      retweet_count: numberField(metrics, ['retweet_count', 'retweets']),
      reply_count: numberField(metrics, ['reply_count', 'replies']),
      quote_count: numberField(metrics, ['quote_count', 'quotes']),
    },
    media: [],
  }
}

export async function fetchXquikUserTweets(
  username: string,
  maxTweets: number = 20
): Promise<TweetData[]> {
  const apiKey = process.env.XQUIK_API_KEY
  if (!apiKey || !username.trim()) {
    return []
  }

  const cleanUsername = username.trim().replace(/^@/, '')
  const url = new URL('/api/v1/x/tweets/search', XQUIK_API_BASE_URL)
  url.searchParams.set('q', `from:${cleanUsername}`)
  url.searchParams.set('limit', String(Math.min(Math.max(maxTweets, 1), 100)))

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Xquik tweet search failed: ${response.status}`)
  }

  const payload: unknown = await response.json()
  return readTweetItems(payload)
    .map((tweet) => mapTweet(tweet, cleanUsername))
    .filter((tweet): tweet is TweetData => tweet !== null)
}
