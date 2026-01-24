'use client'

import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { Bell, Mail, LogOut, Trash2, RefreshCw, Palette, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, themes, Theme } from '@/contexts/ThemeContext'
import { useStoryTheme, storyThemes, daysOfWeek, DayOfWeek, StoryTheme } from '@/contexts/StoryThemeContext'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const { dayThemeMapping, setDayTheme } = useStoryTheme()
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
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen theme-bg theme-fg">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Appearance Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold theme-muted mb-4">Appearance</h2>

          <div className="p-4 theme-card rounded-xl border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg theme-accent-muted flex items-center justify-center">
                <Palette className="w-5 h-5 theme-accent-text" />
              </div>
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm theme-muted">
                  Choose your preferred appearance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative p-3 rounded-lg border-2 transition-all text-left',
                    theme === t.id
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--card-border)] hover:border-[var(--muted)]'
                  )}
                >
                  {theme === t.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <ThemePreview themeId={t.id} />
                  <p className="font-medium text-sm mt-2">{t.name}</p>
                  <p className="text-xs theme-muted">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Story Themes Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold theme-muted mb-4">Story Themes</h2>

          <div className="p-4 theme-card rounded-xl border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg theme-accent-muted flex items-center justify-center">
                <Sparkles className="w-5 h-5 theme-accent-text" />
              </div>
              <div>
                <h3 className="font-medium">Auto Theme Schedule</h3>
                <p className="text-sm theme-muted">
                  Set which theme to use for each day of the week
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {daysOfWeek.map((day) => (
                <div key={day.id} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium w-24">{day.label}</span>
                  <div className="flex-1 flex gap-2 justify-end">
                    {storyThemes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setDayTheme(day.id, t.id)}
                        className={cn(
                          'relative w-10 h-8 rounded-md transition-all',
                          dayThemeMapping[day.id] === t.id
                            ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--card)]'
                            : 'opacity-50 hover:opacity-75'
                        )}
                        style={{ background: t.gradient }}
                        title={t.name}
                      >
                        {dayThemeMapping[day.id] === t.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Theme Legend */}
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <p className="text-xs theme-muted mb-2">Available themes:</p>
              <div className="flex flex-wrap gap-2">
                {storyThemes.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ background: t.gradient }}
                    />
                    <span className="text-xs theme-muted">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold theme-muted mb-4">Notifications</h2>

          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 theme-card rounded-xl border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg theme-accent-muted flex items-center justify-center">
                  <Bell className="w-5 h-5 theme-accent-text" />
                </div>
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm theme-muted">
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
                      ? 'bg-[var(--card-border)] hover:opacity-80'
                      : 'bg-[var(--accent)] text-white hover:opacity-90',
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
                <span className="text-sm theme-muted">Not supported</span>
              )}
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 theme-card rounded-xl border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--info-muted)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[var(--info-text)]" />
                </div>
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm theme-muted">
                    {session.user.email || 'No email connected'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[var(--success-muted)] text-[var(--success-text)] text-sm rounded-full">
                Enabled
              </span>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold theme-muted mb-4">Account</h2>

          <div className="space-y-4">
            {/* Connected X Account */}
            <div className="flex items-center justify-between p-4 theme-card rounded-xl border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--card-border)] flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">X Account</h3>
                  <p className="text-sm theme-muted">
                    @{session.user.xUsername || 'Not connected'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[var(--success-muted)] text-[var(--success-text)] text-sm rounded-full">
                Connected
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full flex items-center justify-between p-4 theme-card rounded-xl border hover:border-[var(--danger)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--danger-muted)] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[var(--danger-text)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium group-hover:text-[var(--danger-text)] transition-colors">
                    Sign Out
                  </h3>
                  <p className="text-sm theme-muted">
                    Sign out of your account
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--danger-text)] mb-4">Danger Zone</h2>

          <div className="p-4 bg-[var(--danger-muted)] rounded-xl border border-[var(--danger)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--danger-muted)] flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[var(--danger-text)]" />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--danger-text)]">Delete Account</h3>
                  <p className="text-sm theme-muted">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Delete
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function ThemePreview({ themeId }: { themeId: Theme }) {
  const previewStyles: Record<Theme, { bg: string; card: string; accent: string }> = {
    midnight: { bg: '#0a0a0a', card: '#111111', accent: '#9333ea' },
    daylight: { bg: '#ffffff', card: '#f5f5f5', accent: '#7c3aed' },
    paper: { bg: '#faf9f7', card: '#ffffff', accent: '#78716c' },
  }

  const style = previewStyles[themeId]

  return (
    <div
      className="w-full h-12 rounded-md overflow-hidden flex items-end p-1 gap-1"
      style={{ backgroundColor: style.bg }}
    >
      <div
        className="flex-1 h-6 rounded-sm"
        style={{ backgroundColor: style.card }}
      />
      <div
        className="w-4 h-8 rounded-sm"
        style={{ backgroundColor: style.accent }}
      />
    </div>
  )
}
