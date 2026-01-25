'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Calendar, Clock, CheckCircle, AlertCircle, ImageIcon, Instagram } from 'lucide-react'
import { ScheduledPostCard } from './ScheduledPostCard'
import { cn } from '@/lib/utils'

interface ScheduledPost {
  id: string
  scheduledFor: string
  theme: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  postType: 'STORY' | 'POST'
  screenshotUrl: string | null
  previewUrl: string | null
  instagramPostId: string | null
  postedAt: string | null
  errorMessage: string | null
  tweet: {
    id: string
    text: string
    authorName: string
    authorUsername: string
  }
}

type StatusFilter = 'all' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
type TypeFilter = 'all' | 'STORY' | 'POST'

const statusFilters: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'PENDING', label: 'Scheduled', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { value: 'FAILED', label: 'Failed', icon: <AlertCircle className="w-3.5 h-3.5" /> },
]

const typeFilters: { value: TypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'STORY', label: 'Story', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { value: 'POST', label: 'Auto Post', icon: <Instagram className="w-3.5 h-3.5" /> },
]

export function ScheduledPostsList() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const fetchPosts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch('/api/schedule')
      const data = await response.json()

      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter
      const matchesType = typeFilter === 'all' || post.postType === typeFilter
      return matchesStatus && matchesType
    })
  }, [posts, statusFilter, typeFilter])

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return

    try {
      const response = await fetch(`/api/schedule?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to cancel post')
      }
    } catch (error) {
      console.error('Error cancelling post:', error)
      alert('Failed to cancel post')
    }
  }

  const handleRetry = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule/${id}/retry`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to retry post')
      }
    } catch (error) {
      console.error('Error retrying post:', error)
      alert('Failed to retry post')
    }
  }

  const handleMarkPosted = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule/${id}/mark-posted`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to mark as posted')
      }
    } catch (error) {
      console.error('Error marking as posted:', error)
      alert('Failed to mark as posted')
    }
  }

  const handleProcess = async (id: string) => {
    // Optimistically update to show processing state
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'PROCESSING' as const } : p))
    )

    try {
      const response = await fetch(`/api/schedule/${id}/process`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        fetchPosts()
      } else {
        alert(data.error || 'Failed to process post')
        fetchPosts() // Refresh to get actual state
      }
    } catch (error) {
      console.error('Error processing post:', error)
      alert('Failed to process post')
      fetchPosts()
    }
  }

  // Stats
  const stats = useMemo(() => {
    const pending = posts.filter((p) => p.status === 'PENDING').length
    const completed = posts.filter((p) => p.status === 'COMPLETED').length
    const failed = posts.filter((p) => p.status === 'FAILED').length
    return { pending, completed, failed, total: posts.length }
  }, [posts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="theme-card border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm theme-muted">Total</div>
        </div>
        <div className="theme-card border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-500">{stats.pending}</div>
          <div className="text-sm theme-muted">Scheduled</div>
        </div>
        <div className="theme-card border rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--success-text)]">{stats.completed}</div>
          <div className="text-sm theme-muted">Completed</div>
        </div>
        <div className="theme-card border rounded-xl p-4">
          <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
          <div className="text-sm theme-muted">Failed</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex items-center gap-1 theme-card rounded-lg p-1 border">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === filter.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-muted hover:theme-fg'
              )}
            >
              {filter.icon}
              <span className="hidden sm:inline">{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 theme-card rounded-lg p-1 border">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                typeFilter === filter.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-muted hover:theme-fg'
              )}
            >
              {filter.icon}
              <span className="hidden sm:inline">{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchPosts(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm theme-muted hover:theme-fg transition-colors disabled:opacity-50 ml-auto"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 theme-card border rounded-xl">
          <Calendar className="w-12 h-12 mx-auto theme-muted mb-4" />
          <p className="theme-muted mb-2">No scheduled posts found</p>
          <p className="text-sm theme-muted">
            {statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try changing your filters'
              : 'Schedule some tweets to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPosts.map((post) => (
            <ScheduledPostCard
              key={post.id}
              {...post}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onMarkPosted={handleMarkPosted}
              onProcess={handleProcess}
            />
          ))}
        </div>
      )}
    </div>
  )
}
