'use client'

import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { Bell, Mail, LogOut, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true)
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  const enablePushNotifications = async () => {
    if (!pushSupported) return

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        // Register service worker
        await navigator.serviceWorker.register('/firebase-messaging-sw.js')

        // Get FCM token (would need Firebase setup in frontend)
        // For now, we'll just update the state
        setPushEnabled(true)

        // In production, you'd get the actual FCM token and register it:
        // const token = await getToken(messaging, { vapidKey: '...' })
        // await fetch('/api/fcm', { method: 'POST', body: JSON.stringify({ token }) })
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const disablePushNotifications = async () => {
    setLoading(true)
    try {
      // In production, you'd unregister the FCM token
      // await fetch('/api/fcm?token=...', { method: 'DELETE' })
      setPushEnabled(false)
    } catch (error) {
      console.error('Error disabling push notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Notifications Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Notifications</h2>

          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Get notified when your screenshots are ready
                  </p>
                </div>
              </div>
              {pushSupported ? (
                <button
                  onClick={pushEnabled ? disablePushNotifications : enablePushNotifications}
                  disabled={loading}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pushEnabled
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : pushEnabled ? (
                    'Disable'
                  ) : (
                    'Enable'
                  )}
                </button>
              ) : (
                <span className="text-sm text-gray-500">Not supported</span>
              )}
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500">
                    {session.user.email || 'No email connected'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full">
                Enabled
              </span>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Account</h2>

          <div className="space-y-4">
            {/* Connected X Account */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">X Account</h3>
                  <p className="text-sm text-gray-500">
                    @{session.user.xUsername || 'Not connected'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full">
                Connected
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-red-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium group-hover:text-red-400 transition-colors">
                    Sign Out
                  </h3>
                  <p className="text-sm text-gray-500">
                    Sign out of your account
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>

          <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-red-400">Delete Account</h3>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
