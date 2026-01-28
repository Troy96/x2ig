import { chromium, Browser } from 'playwright'

export type Theme = 'SHINY_PURPLE' | 'MANGO_JUICE' | 'OCEAN_BREEZE' | 'FOREST_GLOW' | 'SUNSET_VIBES'

const themeGradients: Record<Theme, string> = {
  SHINY_PURPLE: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  MANGO_JUICE: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f9a825 100%)',
  OCEAN_BREEZE: 'linear-gradient(135deg, #667eea 0%, #64b5f6 50%, #4dd0e1 100%)',
  FOREST_GLOW: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  SUNSET_VIBES: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
}

// Output dimensions: Square for Instagram
const OUTPUT_SIZE = 1080

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

export interface ScreenshotOptions {
  tweetUrl: string
  theme: Theme
  outputPath?: string
}

export interface ScreenshotResult {
  buffer: Buffer
  width: number
  height: number
}

export interface TweetData {
  text: string
  authorName: string
  authorUsername: string
  authorImage?: string | null
  createdAt?: string | Date
}

// Generate tweet card HTML
function generateTweetCardHtml(tweet: TweetData, theme: Theme): string {
  const gradient = themeGradients[theme] || themeGradients.SHINY_PURPLE

  const formattedDate = tweet.createdAt
    ? new Date(tweet.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: ${OUTPUT_SIZE}px;
          height: ${OUTPUT_SIZE}px;
          background: ${gradient};
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          width: calc(100% - 80px);
          margin: 40px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #1da1f2;
          margin-right: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 24px;
          overflow: hidden;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .author-info {
          flex: 1;
        }
        .author-name {
          font-weight: 700;
          font-size: 18px;
          color: #0f1419;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .verified-badge {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .author-username {
          color: #536471;
          font-size: 16px;
        }
        .x-logo {
          width: 28px;
          height: 28px;
        }
        .tweet-text {
          font-size: 22px;
          line-height: 1.5;
          color: #0f1419;
          margin-bottom: 20px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .tweet-date {
          color: #536471;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="avatar">${tweet.authorImage
            ? `<img src="${tweet.authorImage}" alt="" />`
            : tweet.authorName.charAt(0).toUpperCase()}</div>
          <div class="author-info">
            <div class="author-name">
              ${escapeHtml(tweet.authorName)}
              <svg class="verified-badge" viewBox="0 0 22 22" fill="#1d9bf0">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
              </svg>
            </div>
            <div class="author-username">@${escapeHtml(tweet.authorUsername)}</div>
          </div>
          <svg class="x-logo" viewBox="0 0 24 24" fill="#0f1419">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <div class="tweet-text">${escapeHtml(tweet.text)}</div>
        ${formattedDate ? `<div class="tweet-date">${formattedDate}</div>` : ''}
      </div>
    </body>
    </html>
  `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// New function that renders our own tweet card
export async function captureTweetScreenshot(
  tweetUrl: string,
  theme: Theme,
  tweetData?: TweetData
): Promise<ScreenshotResult> {
  if (!tweetData) {
    throw new Error('Tweet data is required')
  }

  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: OUTPUT_SIZE, height: OUTPUT_SIZE },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    const html = generateTweetCardHtml(tweetData, theme)
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE },
    })

    await context.close()

    return {
      buffer: screenshotBuffer,
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
    }
  } catch (error) {
    await context.close()
    throw new Error(`Failed to capture tweet screenshot: ${error}`)
  }
}


