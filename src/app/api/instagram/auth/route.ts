import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Initiate Instagram OAuth flow
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appId = process.env.INSTAGRAM_APP_ID
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: 'Instagram API not configured' },
        { status: 500 }
      )
    }

    // Build the Instagram OAuth URL
    // Using new Instagram Platform API (July 2024) - direct Instagram login
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
    ].join(',')

    // Store user ID in state for security
    const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString('base64')

    const authUrl = new URL('https://www.instagram.com/oauth/authorize')
    authUrl.searchParams.set('client_id', appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('enable_fb_login', '0')
    authUrl.searchParams.set('force_authentication', '1')

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error initiating Instagram OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Instagram OAuth' },
      { status: 500 }
    )
  }
}
