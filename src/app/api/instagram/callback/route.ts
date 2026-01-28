import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Handle Instagram OAuth callback
export async function GET(request: NextRequest) {
  // Use NEXTAUTH_URL for redirects to ensure correct domain
  const baseUrl = process.env.NEXTAUTH_URL || request.url

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/settings?instagram_error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?instagram_error=Missing authorization code', baseUrl)
      )
    }

    // Decode state to get user ID
    let userId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = stateData.userId
    } catch {
      return NextResponse.redirect(
        new URL('/settings?instagram_error=Invalid state parameter', baseUrl)
      )
    }

    const appId = process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/settings?instagram_error=Instagram API not configured', baseUrl)
      )
    }

    // Step 1: Exchange code for short-lived access token (Instagram API)
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error_type || tokenData.error) {
      console.error('Token exchange error:', tokenData)
      return NextResponse.redirect(
        new URL(`/settings?instagram_error=${encodeURIComponent(tokenData.error_message || tokenData.error || 'Token exchange failed')}`, baseUrl)
      )
    }

    const shortLivedToken = tokenData.access_token

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
    )

    const longLivedData = await longLivedResponse.json()

    if (longLivedData.error) {
      console.error('Long-lived token error:', longLivedData.error)
      return NextResponse.redirect(
        new URL(`/settings?instagram_error=${encodeURIComponent(longLivedData.error.message || 'Failed to get long-lived token')}`, baseUrl)
      )
    }

    const longLivedToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000 // Default 60 days in seconds

    // Step 3: Get Instagram user info (use 'id' field - this is the correct ID for publishing)
    const igUserResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longLivedToken}`
    )

    const igUserData = await igUserResponse.json()

    if (igUserData.error) {
      console.error('Instagram user error:', igUserData.error)
      return NextResponse.redirect(
        new URL(`/settings?instagram_error=${encodeURIComponent(igUserData.error.message || 'Failed to get Instagram username')}`, baseUrl)
      )
    }

    const instagramUserId = igUserData.id
    const username = igUserData.username

    if (!instagramUserId) {
      return NextResponse.redirect(
        new URL('/settings?instagram_error=Failed to get Instagram user ID', baseUrl)
      )
    }

    // Step 4: Calculate token expiration date
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 5: Save to database (upsert to handle reconnection)
    await prisma.instagramAccount.upsert({
      where: { userId },
      update: {
        instagramUserId,
        username,
        accessToken: longLivedToken,
        tokenExpiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        instagramUserId,
        username,
        accessToken: longLivedToken,
        tokenExpiresAt,
      },
    })

    // Success! Redirect to settings page
    return NextResponse.redirect(
      new URL('/settings?instagram_success=true', baseUrl)
    )
  } catch (error) {
    console.error('Instagram callback error:', error)
    return NextResponse.redirect(
      new URL(`/settings?instagram_error=${encodeURIComponent('An unexpected error occurred')}`, baseUrl)
    )
  }
}
