import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchUserTweets } from '@/lib/twitter'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const refresh = searchParams.get('refresh') === 'true'
    const filter = searchParams.get('filter') || 'all' // all, posted, unposted

    // Get user's X user ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { xUserId: true },
    })

    if (!user?.xUserId) {
      return NextResponse.json(
        { error: 'X account not connected' },
        { status: 400 }
      )
    }

    // Check if we need to fetch fresh tweets
    const existingTweets = await prisma.tweet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    const shouldRefresh =
      refresh ||
      existingTweets.length === 0 ||
      (existingTweets[0] &&
        Date.now() - existingTweets[0].fetchedAt.getTime() > 5 * 60 * 1000) // 5 minutes cache

    let tweets = existingTweets

    if (shouldRefresh) {
      // Fetch fresh tweets from X API
      const freshTweets = await fetchUserTweets(user.xUserId, 50)

      // Upsert tweets to database
      for (const tweet of freshTweets) {
        await prisma.tweet.upsert({
          where: { tweetId: tweet.id },
          update: {
            text: tweet.text,
            likeCount: tweet.public_metrics?.like_count || 0,
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
            fetchedAt: new Date(),
          },
          create: {
            tweetId: tweet.id,
            userId: session.user.id,
            text: tweet.text,
            authorName: tweet.author.name,
            authorUsername: tweet.author.username,
            authorImage: tweet.author.profile_image_url,
            mediaUrls: tweet.media?.map((m) => m.url || m.preview_image_url).filter(Boolean) as string[] || [],
            likeCount: tweet.public_metrics?.like_count || 0,
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
            createdAt: new Date(tweet.created_at),
          },
        })
      }

      // Refetch from database
      tweets = await prisma.tweet.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      })
    }

    // Get scheduled post statuses
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { userId: session.user.id },
      select: { tweetId: true, status: true },
    })

    const scheduledTweetIds = new Set(
      scheduledPosts
        .filter((p) => p.status === 'COMPLETED')
        .map((p) => p.tweetId)
    )

    // Filter tweets
    let filteredTweets = tweets.map((tweet) => ({
      ...tweet,
      isPosted: scheduledTweetIds.has(tweet.id),
    }))

    if (filter === 'posted') {
      filteredTweets = filteredTweets.filter((t) => t.isPosted)
    } else if (filter === 'unposted') {
      filteredTweets = filteredTweets.filter((t) => !t.isPosted)
    }

    return NextResponse.json({ tweets: filteredTweets })
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    )
  }
}
