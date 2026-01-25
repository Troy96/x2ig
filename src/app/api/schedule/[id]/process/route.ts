import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Mark a scheduled post as complete (for Story posts with existing preview)
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
      include: {
        tweet: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only complete pending posts' },
        { status: 400 }
      )
    }

    // For Story posts, just mark as completed
    // The previewUrl already contains the screenshot
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: 'COMPLETED',
        // Use previewUrl as screenshotUrl if no screenshotUrl exists
        screenshotUrl: post.screenshotUrl || post.previewUrl,
      },
      include: {
        tweet: true,
      },
    })

    return NextResponse.json({
      message: 'Post marked as complete',
      post: updatedPost,
    })
  } catch (error) {
    console.error('Error completing scheduled post:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete post' },
      { status: 500 }
    )
  }
}
