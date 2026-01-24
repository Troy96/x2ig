import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@x2ig.app'

export interface EmailNotificationPayload {
  to: string
  subject: string
  tweetText: string
  imageUrl: string
}

export async function sendEmailNotification(
  payload: EmailNotificationPayload
): Promise<{ id: string } | null> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured, skipping email notification')
    return null
  }

  const { to, subject, tweetText, imageUrl } = payload

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: generateEmailHtml(tweetText, imageUrl),
    })

    if (error) {
      throw error
    }

    console.log('Email sent:', data?.id)
    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

function generateEmailHtml(tweetText: string, imageUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Instagram Story is Ready</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .tweet-text {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #555;
            border-left: 4px solid #667eea;
          }
          .image-container {
            text-align: center;
            margin: 30px 0;
          }
          .image-container img {
            max-width: 100%;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            opacity: 0.9;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 14px;
          }
          .instructions {
            background-color: #f0f9ff;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .instructions h3 {
            margin-top: 0;
            color: #1a73e8;
          }
          .instructions ol {
            margin-bottom: 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">x2ig</div>
          </div>

          <h1>Your Instagram Story is Ready!</h1>

          <p>Great news! Your tweet screenshot has been generated and is ready to be posted on Instagram.</p>

          <div class="tweet-text">
            "${tweetText.slice(0, 200)}${tweetText.length > 200 ? '...' : ''}"
          </div>

          <div class="image-container">
            <img src="${imageUrl}" alt="Screenshot preview" />
          </div>

          <div class="instructions">
            <h3>How to post:</h3>
            <ol>
              <li>Long-press the image above to save it to your device</li>
              <li>Open Instagram and create a new Story</li>
              <li>Select the saved image from your gallery</li>
              <li>Add any stickers or text you want</li>
              <li>Share to your Story!</li>
            </ol>
          </div>

          <p style="text-align: center;">
            <a href="${imageUrl}" class="button" download>Download Image</a>
          </p>

          <div class="footer">
            <p>This email was sent by x2ig - Your X to Instagram automation tool</p>
            <p>If you didn't schedule this post, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function sendWelcomeEmail(to: string, name: string): Promise<{ id: string } | null> {
  if (!process.env.RESEND_API_KEY) {
    return null
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to x2ig!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                background: linear-gradient(135deg, #667eea 0%, #f5576c 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">x2ig</div>
              <h1>Welcome, ${name}!</h1>
              <p>Thanks for signing up for x2ig. You can now:</p>
              <ul>
                <li>Connect your X (Twitter) account</li>
                <li>Select tweets to convert to Instagram stories</li>
                <li>Schedule posts with beautiful themes</li>
                <li>Receive notifications when your stories are ready</li>
              </ul>
              <p>Get started by visiting your dashboard!</p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return null
  }
}
