'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Calendar, ArrowUpDown, Heart, MessageCircle, Repeat2, Clock } from 'lucide-react'
import { TweetCard } from './TweetCard'
import { ScheduleModal } from './ScheduleModal'
import { BulkScheduleModal } from './BulkScheduleModal'
import { cn } from '@/lib/utils'

interface Tweet {
  id: string
  tweetId: string
  text: string
  authorName: string
  authorUsername: string
  authorImage: string | null
  likeCount: number
  retweetCount: number
  replyCount: number
  createdAt: string
  mediaUrls: string[]
  isPosted: boolean
}

type FilterType = 'all' | 'posted' | 'unposted'
type SortField = 'date' | 'likes' | 'retweets' | 'replies'
type SortOrder = 'asc' | 'desc'

const sortOptions: { field: SortField; label: string; icon: React.ReactNode }[] = [
  { field: 'date', label: 'Date', icon: <Clock className="w-3.5 h-3.5" /> },
  { field: 'likes', label: 'Likes', icon: <Heart className="w-3.5 h-3.5" /> },
  { field: 'retweets', label: 'Retweets', icon: <Repeat2 className="w-3.5 h-3.5" /> },
  { field: 'replies', label: 'Replies', icon: <MessageCircle className="w-3.5 h-3.5" /> },
]

export function TweetList() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('unposted')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scheduleModalTweet, setScheduleModalTweet] = useState<Tweet | null>(null)
  const [showBulkSchedule, setShowBulkSchedule] = useState(false)

  const fetchTweets = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({ filter })
      if (refresh) params.set('refresh', 'true')

      const response = await fetch(`/api/tweets?${params}`)
      const data = await response.json()

      if (data.tweets) {
        setTweets(data.tweets)
      }
    } catch (error) {
      console.error('Error fetching tweets:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    fetchTweets()
  }, [fetchTweets])

  const sortedTweets = useMemo(() => {
    const sorted = [...tweets].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'likes':
          comparison = a.likeCount - b.likeCount
          break
        case 'retweets':
          comparison = a.retweetCount - b.retweetCount
          break
        case 'replies':
          comparison = a.replyCount - b.replyCount
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })
    return sorted
  }, [tweets, sortField, sortOrder])

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const unpostedTweets = tweets.filter((t) => !t.isPosted)
    if (selectedIds.size === unpostedTweets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(unpostedTweets.map((t) => t.id)))
    }
  }

  const handleSchedule = (id: string) => {
    const tweet = tweets.find((t) => t.id === id)
    if (tweet) {
      setScheduleModalTweet(tweet)
    }
  }

  const handleBulkSchedule = () => {
    if (selectedIds.size > 0) {
      setShowBulkSchedule(true)
    }
  }

  const selectedTweets = tweets.filter((t) => selectedIds.has(t.id))
  const unpostedCount = tweets.filter((t) => !t.isPosted).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 theme-card rounded-lg p-1 border">
          {(['all', 'unposted', 'posted'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-muted hover:theme-fg'
              )}
            >
              {f === 'all' && 'All'}
              {f === 'unposted' && 'Unposted'}
              {f === 'posted' && 'Posted'}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-1 theme-card rounded-lg p-1 border">
          <span className="px-2 text-xs theme-muted flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            Sort
          </span>
          {sortOptions.map((option) => (
            <button
              key={option.field}
              onClick={() => handleSortClick(option.field)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                sortField === option.field
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-muted hover:theme-fg'
              )}
              title={`Sort by ${option.label} (${sortField === option.field ? (sortOrder === 'desc' ? 'high to low' : 'low to high') : 'click to sort'})`}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
              {sortField === option.field && (
                <span className="text-xs opacity-75">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchTweets(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm theme-muted hover:theme-fg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>

        {filter !== 'posted' && unpostedCount > 0 && (
          <>
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm theme-muted hover:theme-fg transition-colors"
            >
              {selectedIds.size === unpostedCount ? 'Deselect All' : 'Select All'}
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkSchedule}
                className="flex items-center gap-2 px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity ml-auto"
              >
                <Calendar className="w-4 h-4" />
                Schedule {selectedIds.size} Tweet{selectedIds.size > 1 ? 's' : ''}
              </button>
            )}
          </>
        )}
      </div>

      {/* Tweet Grid */}
      {sortedTweets.length === 0 ? (
        <div className="text-center py-12">
          <p className="theme-muted">No tweets found</p>
          <button
            onClick={() => fetchTweets(true)}
            className="mt-4 theme-accent-text hover:opacity-80"
          >
            Refresh to fetch tweets
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              {...tweet}
              isSelected={selectedIds.has(tweet.id)}
              onSelect={handleSelect}
              onSchedule={handleSchedule}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {scheduleModalTweet && (
        <ScheduleModal
          tweet={scheduleModalTweet}
          onClose={() => setScheduleModalTweet(null)}
          onScheduled={() => {
            setScheduleModalTweet(null)
            fetchTweets()
          }}
        />
      )}

      {showBulkSchedule && (
        <BulkScheduleModal
          tweets={selectedTweets}
          onClose={() => setShowBulkSchedule(false)}
          onScheduled={() => {
            setShowBulkSchedule(false)
            setSelectedIds(new Set())
            fetchTweets()
          }}
        />
      )}
    </div>
  )
}
