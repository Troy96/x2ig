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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const fetchCount = parseInt(searchParams.get('fetchCount') || '20', 10) // How many to fetch from Twitter

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

    // Only fetch from Twitter if explicitly requested with refresh=true
    // No more automatic refresh based on time
    if (refresh) {
      // Fetch tweets from X API (limited to fetchCount to save credits)
      const freshTweets = await fetchUserTweets(user.xUserId, Math.min(fetchCount, 100))

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
    }

    // Build filter conditions
    const whereCondition: Record<string, unknown> = { userId: session.user.id }

    // Get scheduled post statuses for filtering
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { userId: session.user.id },
      select: { tweetId: true, status: true },
    })

    const completedTweetIds = scheduledPosts
      .filter((p) => p.status === 'COMPLETED')
      .map((p) => p.tweetId)

    if (filter === 'posted') {
      whereCondition.id = { in: completedTweetIds }
    } else if (filter === 'unposted') {
      whereCondition.id = { notIn: completedTweetIds }
    }

    // Get total count for pagination
    const totalCount = await prisma.tweet.count({ where: whereCondition })

    // Fetch paginated tweets from database
    const tweets = await prisma.tweet.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Mark which tweets are posted
    const scheduledTweetIds = new Set(completedTweetIds)
    const tweetsWithStatus = tweets.map((tweet) => ({
      ...tweet,
      isPosted: scheduledTweetIds.has(tweet.id),
    }))

    return NextResponse.json({
      tweets: tweetsWithStatus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    )
  }
}
