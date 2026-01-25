import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Retry a failed scheduled post
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

    if (post.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Can only retry failed posts' },
        { status: 400 }
      )
    }

    // Reset the post to pending with a new scheduled time (now + 1 minute)
    const newScheduledTime = new Date(Date.now() + 60 * 1000)

    const updatedPost = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: 'PENDING',
        scheduledFor: newScheduledTime,
        errorMessage: null,
      },
    })

    return NextResponse.json({
      message: 'Post rescheduled for retry',
      post: updatedPost,
    })
  } catch (error) {
    console.error('Error retrying scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to retry post' },
      { status: 500 }
    )
  }
}
