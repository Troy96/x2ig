import { TwitterApi } from 'twitter-api-v2'

const bearerToken = process.env.TWITTER_BEARER_TOKEN

if (!bearerToken) {
  console.warn('TWITTER_BEARER_TOKEN is not set')
}

export const twitterClient = new TwitterApi(bearerToken || '')

export interface TweetData {
  id: string
  text: string
  created_at: string
  author: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
  public_metrics?: {
    like_count: number
    retweet_count: number
    reply_count: number
    quote_count: number
  }
  attachments?: {
    media_keys?: string[]
  }
  media?: Array<{
    media_key: string
    type: string
    url?: string
    preview_image_url?: string
  }>
}

export async function fetchUserTweets(
  userId: string,
  maxTweets: number = 200
): Promise<TweetData[]> {
  try {
    const allTweets: TweetData[] = []
    let paginationToken: string | undefined = undefined
    const perPage = 100 // Max allowed by Twitter API

    // Paginate through tweets until we reach maxTweets or run out
    while (allTweets.length < maxTweets) {
      const tweets = await twitterClient.v2.userTimeline(userId, {
        max_results: Math.min(perPage, maxTweets - allTweets.length),
        'tweet.fields': ['created_at', 'public_metrics', 'attachments'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        expansions: ['author_id', 'attachments.media_keys'],
        'media.fields': ['url', 'preview_image_url', 'type'],
        exclude: ['retweets', 'replies'],
        ...(paginationToken && { pagination_token: paginationToken }),
      })

      if (!tweets.data?.data?.length) {
        break // No more tweets
      }

      const users = tweets.includes?.users || []
      const media = tweets.includes?.media || []

      const pageTweets = tweets.data.data.map((tweet) => {
        const author = users.find((u) => u.id === tweet.author_id) || {
          id: tweet.author_id || '',
          name: 'Unknown',
          username: 'unknown',
        }

        const tweetMedia = tweet.attachments?.media_keys
          ?.map((key) => media.find((m) => m.media_key === key))
          .filter(Boolean) as TweetData['media']

        return {
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at || new Date().toISOString(),
          author: {
            id: author.id,
            name: author.name,
            username: author.username,
            profile_image_url: author.profile_image_url,
          },
          public_metrics: tweet.public_metrics,
          attachments: tweet.attachments,
          media: tweetMedia,
        }
      })

      allTweets.push(...pageTweets)

      // Check if there's more pages
      paginationToken = tweets.data.meta?.next_token
      if (!paginationToken) {
        break // No more pages
      }
    }

    return allTweets
  } catch (error) {
    console.error('Error fetching tweets:', error)
    throw error
  }
}

export async function fetchTweetById(tweetId: string): Promise<TweetData | null> {
  try {
    const tweet = await twitterClient.v2.singleTweet(tweetId, {
      'tweet.fields': ['created_at', 'public_metrics', 'attachments'],
      'user.fields': ['name', 'username', 'profile_image_url'],
      expansions: ['author_id', 'attachments.media_keys'],
      'media.fields': ['url', 'preview_image_url', 'type'],
    })

    const author = tweet.includes?.users?.[0] || {
      id: '',
      name: 'Unknown',
      username: 'unknown',
    }

    const media = tweet.includes?.media || []
    const tweetMedia = tweet.data.attachments?.media_keys
      ?.map((key) => media.find((m) => m.media_key === key))
      .filter(Boolean) as TweetData['media']

    return {
      id: tweet.data.id,
      text: tweet.data.text,
      created_at: tweet.data.created_at || new Date().toISOString(),
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
        profile_image_url: author.profile_image_url,
      },
      public_metrics: tweet.data.public_metrics,
      attachments: tweet.data.attachments,
      media: tweetMedia,
    }
  } catch (error) {
    console.error('Error fetching tweet:', error)
    return null
  }
}

export function getTweetUrl(username: string, tweetId: string): string {
  return `https://x.com/${username}/status/${tweetId}`
}
