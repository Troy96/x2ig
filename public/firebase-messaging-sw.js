// Firebase Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Firebase configuration - these should match your Firebase project settings
// In production, you may want to inject these values during build
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'x2ig'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    image: payload.notification?.image || payload.data?.imageUrl,
    tag: payload.data?.postId || 'x2ig-notification',
    requireInteraction: true,
    data: payload.data,
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
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event)

  event.notification.close()

  const action = event.action
  const data = event.notification.data

  if (action === 'dismiss') {
    return
  }

  // Open the app
  const urlToOpen = data?.postId
    ? `/notifications?post=${data.postId}`
    : '/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Handle push events (fallback for when onBackgroundMessage doesn't fire)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event:', event)

  if (event.data) {
    const payload = event.data.json()

    // Only show notification if not already handled by onBackgroundMessage
    if (!payload.notification) {
      const notificationTitle = payload.data?.title || 'x2ig'
      const notificationOptions = {
        body: payload.data?.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        image: payload.data?.imageUrl,
        tag: payload.data?.postId || 'x2ig-notification',
        data: payload.data,
      }

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      )
    }
  }
})
