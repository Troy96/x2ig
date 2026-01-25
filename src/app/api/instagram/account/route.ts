import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Check if user has connected Instagram account
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await prisma.instagramAccount.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        username: true,
        instagramUserId: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    })

    if (!account) {
      return NextResponse.json({ account: null })
    }

    // Check if token is expired
    const isExpired = new Date(account.tokenExpiresAt) < new Date()

    return NextResponse.json({
      account: {
        ...account,
        isExpired,
        expiresIn: Math.max(
          0,
          Math.floor((new Date(account.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        ), // days until expiration
      },
    })
  } catch (error) {
    console.error('Error fetching Instagram account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram account' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect Instagram account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await prisma.instagramAccount.findUnique({
      where: { userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    await prisma.instagramAccount.delete({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ message: 'Instagram account disconnected' })
  } catch (error) {
    console.error('Error disconnecting Instagram account:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Instagram account' },
      { status: 500 }
    )
  }
}
