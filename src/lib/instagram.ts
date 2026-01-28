/**
 * Instagram Graph API utilities for publishing posts
 *
 * Publishing flow (Instagram Content Publishing API):
 * 1. Create media container with image URL
 * 2. Poll container status until FINISHED
 * 3. Publish the container
 *
 * Rate limits:
 * - 25 posts per 24-hour rolling window per account
 * - ~200 API calls per user per hour
 */

const INSTAGRAM_GRAPH_API = 'https://graph.instagram.com'
const API_VERSION = 'v21.0'

interface CreateContainerResponse {
  id: string
}

interface ContainerStatusResponse {
  status_code: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  status?: string
}

interface PublishResponse {
  id: string
}

interface MediaResponse {
  id: string
  permalink?: string
}

interface RefreshTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InstagramError {
  error: {
    message: string
    type: string
    code: number
    fbtrace_id?: string
  }
}

/**
 * Create a media container for an image
 * The image must be publicly accessible via HTTPS
 */
export async function createMediaContainer(
  accessToken: string,
  instagramUserId: string,
  imageUrl: string,
  caption?: string
): Promise<string> {
  const url = new URL(`${INSTAGRAM_GRAPH_API}/${API_VERSION}/${instagramUserId}/media`)

  const params: Record<string, string> = {
    image_url: imageUrl,
    access_token: accessToken,
  }

  if (caption) {
    params.caption = caption
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })

  const data = await response.json()

  if ((data as InstagramError).error) {
    const error = data as InstagramError
    throw new Error(`Instagram API error: ${error.error.message} (code: ${error.error.code})`)
  }

  return (data as CreateContainerResponse).id
}

/**
 * Check the status of a media container
 */
export async function getContainerStatus(
  accessToken: string,
  containerId: string
): Promise<ContainerStatusResponse> {
  const url = new URL(`${INSTAGRAM_GRAPH_API}/${API_VERSION}/${containerId}`)
  url.searchParams.set('fields', 'status_code,status')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())
  const data = await response.json()

  if ((data as InstagramError).error) {
    const error = data as InstagramError
    throw new Error(`Instagram API error: ${error.error.message} (code: ${error.error.code})`)
  }

  return data as ContainerStatusResponse
}

/**
 * Wait for a media container to be ready for publishing
 * Polls the status until FINISHED or error/timeout
 */
export async function waitForContainerReady(
  accessToken: string,
  containerId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getContainerStatus(accessToken, containerId)

    switch (status.status_code) {
      case 'FINISHED':
        return // Ready to publish
      case 'IN_PROGRESS':
        // Still processing, wait and retry
        await sleep(intervalMs)
        break
      case 'ERROR':
        throw new Error(`Container processing failed: ${status.status || 'Unknown error'}`)
      case 'EXPIRED':
        throw new Error('Container expired before publishing')
      case 'PUBLISHED':
        throw new Error('Container was already published')
      default:
        throw new Error(`Unknown container status: ${status.status_code}`)
    }
  }

  throw new Error(`Container not ready after ${maxAttempts} attempts`)
}

/**
 * Publish a media container to Instagram feed
 */
export async function publishMedia(
  accessToken: string,
  instagramUserId: string,
  containerId: string
): Promise<string> {
  const url = new URL(`${INSTAGRAM_GRAPH_API}/${API_VERSION}/${instagramUserId}/media_publish`)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    }),
  })

  const data = await response.json()

  if ((data as InstagramError).error) {
    const error = data as InstagramError
    throw new Error(`Instagram API error: ${error.error.message} (code: ${error.error.code})`)
  }

  return (data as PublishResponse).id
}

/**
 * Get the permalink for a published post
 */
export async function getMediaPermalink(
  accessToken: string,
  mediaId: string
): Promise<string | null> {
  const url = new URL(`${INSTAGRAM_GRAPH_API}/${API_VERSION}/${mediaId}`)
  url.searchParams.set('fields', 'permalink')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())
  const data = await response.json()

  if ((data as InstagramError).error) {
    console.error('Failed to get permalink:', (data as InstagramError).error)
    return null
  }

  return (data as MediaResponse).permalink || null
}

/**
 * Full publish flow: create container, wait for ready, publish
 */
export async function publishImageToInstagram(
  accessToken: string,
  instagramUserId: string,
  imageUrl: string,
  caption?: string
): Promise<{ mediaId: string; permalink: string | null }> {
  // Step 1: Create media container
  console.log('Creating Instagram media container...')
  const containerId = await createMediaContainer(accessToken, instagramUserId, imageUrl, caption)
  console.log(`Container created: ${containerId}`)

  // Step 2: Wait for container to be ready
  console.log('Waiting for container to be ready...')
  await waitForContainerReady(accessToken, containerId)
  console.log('Container ready')

  // Step 3: Publish
  console.log('Publishing to Instagram...')
  const mediaId = await publishMedia(accessToken, instagramUserId, containerId)
  console.log(`Published! Media ID: ${mediaId}`)

  // Step 4: Get permalink (optional, for reference)
  const permalink = await getMediaPermalink(accessToken, mediaId)

  return { mediaId, permalink }
}

/**
 * Refresh a long-lived access token
 * Should be called before the token expires (within 60 days)
 * Returns a new token valid for another 60 days
 */
export async function refreshAccessToken(
  accessToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${INSTAGRAM_GRAPH_API}/refresh_access_token`)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())
  const data = await response.json()

  if ((data as InstagramError).error) {
    const error = data as InstagramError
    throw new Error(`Token refresh failed: ${error.error.message}`)
  }

  const result = data as RefreshTokenResponse
  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
