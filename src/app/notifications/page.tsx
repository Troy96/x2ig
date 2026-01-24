'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { NotificationHistory } from '@/components/NotificationHistory'
import { useEffect } from 'react'

export default function NotificationsPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <NotificationHistory />
      </main>
    </div>
  )
}
