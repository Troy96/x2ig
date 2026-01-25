'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { ScheduledPostsList } from '@/components/ScheduledPostsList'
import { useEffect } from 'react'

export default function ScheduledPage() {
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Scheduled Posts</h1>
          <p className="theme-muted">
            Manage your scheduled Instagram stories and posts
          </p>
        </div>
        <ScheduledPostsList />
      </main>
    </div>
  )
}
