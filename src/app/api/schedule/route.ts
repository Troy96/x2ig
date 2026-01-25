import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultTheme } from '@/lib/utils'

// GET - List scheduled posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { userId: session.user.id }
    if (status) {
      where.status = status
    }

    const posts = await prisma.scheduledPost.findMany({
      where,
      include: {
        tweet: true,
      },
      orderBy: { scheduledFor: 'asc' },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching scheduled posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    )
  }
}

// POST - Create new scheduled post(s)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tweets, scheduledFor, theme, postType, previewUrl } = body

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'At least one tweet is required' },
        { status: 400 }
      )
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'Scheduled time is required' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledFor)
    if (scheduledDate < new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Determine theme (manual override or auto-select based on day)
    const selectedTheme = theme || getDefaultTheme(scheduledDate)

    const createdPosts = []

    for (const tweetId of tweets) {
      // Verify tweet belongs to user
      const tweet = await prisma.tweet.findFirst({
        where: {
          id: tweetId,
          userId: session.user.id,
        },
      })

      if (!tweet) {
        continue
      }

      // Check for existing scheduled post
      const existingPost = await prisma.scheduledPost.findFirst({
        where: {
          tweetId: tweet.id,
          userId: session.user.id,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      })

      if (existingPost) {
        continue
      }

      // Validate postType
      const validPostType = postType === 'POST' ? 'POST' : 'STORY'

      // Create scheduled post (queue disabled - just save to DB)
      const post = await prisma.scheduledPost.create({
        data: {
          userId: session.user.id,
          tweetId: tweet.id,
          scheduledFor: scheduledDate,
          theme: selectedTheme,
          postType: validPostType,
          status: 'PENDING',
          previewUrl: previewUrl || null,
        },
      })

      createdPosts.push(post)
    }

    return NextResponse.json({
      message: `Scheduled ${createdPosts.length} post(s)`,
      posts: createdPosts,
    })
  } catch (error) {
    console.error('Error creating scheduled posts:', error)
    return NextResponse.json(
      { error: 'Failed to schedule posts' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        userId: session.user.id,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Cannot cancel a post that is currently processing' },
        { status: 400 }
      )
    }

    // Delete from database (allow PENDING, COMPLETED, FAILED)
    await prisma.scheduledPost.delete({
      where: { id: post.id },
    })

    return NextResponse.json({ message: 'Post cancelled' })
  } catch (error) {
    console.error('Error cancelling scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to cancel post' },
      { status: 500 }
    )
  }
}
