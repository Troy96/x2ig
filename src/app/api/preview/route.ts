import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { captureTweetScreenshot, Theme } from '@/lib/screenshot'
import { getTweetUrl } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tweetId, theme = 'SHINY_PURPLE' } = body

    if (!tweetId) {
      return NextResponse.json({ error: 'Tweet ID required' }, { status: 400 })
    }

    // Get tweet from database
    const tweet = await prisma.tweet.findFirst({
      where: {
        id: tweetId,
        userId: session.user.id,
      },
    })

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 })
    }

    // Generate tweet URL
    const tweetUrl = getTweetUrl(tweet.authorUsername, tweet.tweetId)

    // Capture screenshot using our own renderer
    const result = await captureTweetScreenshot(tweetUrl, theme as Theme, {
      text: tweet.text,
      authorName: tweet.authorName,
      authorUsername: tweet.authorUsername,
      authorImage: tweet.authorImage,
      createdAt: tweet.createdAt,
    })

    // Return as base64 image for preview
    const base64 = result.buffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      preview: dataUrl,
      width: result.width,
      height: result.height,
    })
  } catch (error) {
    console.error('Error generating preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
