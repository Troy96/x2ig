import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Mark a story as manually posted
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const post = await prisma.scheduledPost.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only mark completed posts as posted' },
        { status: 400 }
      )
    }

    if (post.postType !== 'STORY') {
      return NextResponse.json(
        { error: 'Can only mark stories as posted' },
        { status: 400 }
      )
    }

    // Update the post with postedAt timestamp
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        postedAt: new Date(),
      },
    })

    // Also mark the tweet as posted
    await prisma.tweet.update({
      where: { id: post.tweetId },
      data: {
        // We could add an isPosted field to Tweet if needed
        // For now, we just track it on the ScheduledPost
      },
    })

    return NextResponse.json({
      message: 'Post marked as posted',
      post: updatedPost,
    })
  } catch (error) {
    console.error('Error marking post as posted:', error)
    return NextResponse.json(
      { error: 'Failed to mark post as posted' },
      { status: 500 }
    )
  }
}
