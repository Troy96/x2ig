import admin from 'firebase-admin'

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
}

export interface PushNotificationPayload {
  token: string
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<string | null> {
  if (!admin.apps.length) {
    console.warn('Firebase not initialized, skipping push notification')
    return null
  }

  const { token, title, body, imageUrl, data } = payload

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
        imageUrl,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile apps
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          image: imageUrl,
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open App',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
        },
        fcmOptions: {
          link: '/',
        },
      },
      android: {
        notification: {
          channelId: 'x2ig_posts',
          priority: 'high',
          imageUrl,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
            sound: 'default',
          },
        },
        fcmOptions: {
          imageUrl,
        },
      },
    }

    const response = await admin.messaging().send(message)
    console.log('Push notification sent:', response)
    return response
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}

export async function sendMultiplePushNotifications(
  tokens: string[],
  title: string,
  body: string,
  imageUrl?: string,
  data?: Record<string, string>
): Promise<admin.messaging.BatchResponse | null> {
  if (!admin.apps.length) {
    console.warn('Firebase not initialized, skipping push notifications')
    return null
  }

  if (tokens.length === 0) {
    return null
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
        imageUrl,
      },
      data,
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failures`)
    return response
  } catch (error) {
    console.error('Error sending push notifications:', error)
    throw error
  }
}

export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<admin.messaging.MessagingTopicManagementResponse | null> {
  if (!admin.apps.length) {
    return null
  }

  try {
    return await admin.messaging().subscribeToTopic(tokens, topic)
  } catch (error) {
    console.error('Error subscribing to topic:', error)
    throw error
  }
}

export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<admin.messaging.MessagingTopicManagementResponse | null> {
  if (!admin.apps.length) {
    return null
  }

  try {
    return await admin.messaging().unsubscribeFromTopic(tokens, topic)
  } catch (error) {
    console.error('Error unsubscribing from topic:', error)
    throw error
  }
}
