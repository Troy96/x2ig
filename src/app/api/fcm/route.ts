import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Register FCM token
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token, deviceInfo } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Upsert token (update if exists, create if not)
    await prisma.fcmToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        deviceInfo,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        deviceInfo,
      },
    })

    return NextResponse.json({ message: 'Token registered' })
  } catch (error) {
    console.error('Error registering FCM token:', error)
    return NextResponse.json(
      { error: 'Failed to register token' },
      { status: 500 }
    )
  }
}

// DELETE - Unregister FCM token
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    await prisma.fcmToken.deleteMany({
      where: {
        token,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: 'Token unregistered' })
  } catch (error) {
    console.error('Error unregistering FCM token:', error)
    return NextResponse.json(
      { error: 'Failed to unregister token' },
      { status: 500 }
    )
  }
}
