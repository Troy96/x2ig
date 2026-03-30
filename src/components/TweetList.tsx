'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Calendar, ArrowUpDown, Heart, MessageCircle, Repeat2, Clock, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filter, setFilter] = useState<FilterType>('unposted')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scheduleModalTweet, setScheduleModalTweet] = useState<Tweet | null>(null)
  const [showBulkSchedule, setShowBulkSchedule] = useState(false)

  const fetchTweets = useCallback(async (options: { refresh?: boolean; loadOlder?: boolean; targetPage?: number; search?: string } = {}) => {
    const { refresh = false, loadOlder = false, targetPage = 1, search = searchQuery } = options
    try {
      if (refresh) {
        setRefreshing(true)
      } else if (loadOlder) {
        setLoadingOlder(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        filter,
        page: String(targetPage),
        limit: '20',
      })
      if (refresh) params.set('refresh', 'true')
      if (loadOlder) params.set('loadOlder', 'true')
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/tweets?${params}`)
      const data = await response.json()

      if (data.tweets) {
        setTweets(data.tweets)
      }
      if (data.pagination) {
        setPage(data.pagination.page)
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.totalCount)
      }
      setHasMoreOlder(!!data.hasMoreOlder)
    } catch (error) {
      console.error('Error fetching tweets:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingOlder(false)
    }
  }, [filter, searchQuery])

  const goToPage = useCallback((targetPage: number) => {
    if (targetPage < 1) return
    if (targetPage <= totalPages) {
      fetchTweets({ targetPage })
    } else if (hasMoreOlder) {
      // Past the last page — fetch older tweets from Twitter
      // The loadOlder flag fetches from X and returns the updated page
      fetchTweets({ loadOlder: true, targetPage })
    }
  }, [fetchTweets, totalPages, hasMoreOlder])

  // Debounce search — fetch from server after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTweets({ targetPage: 1 })
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery])

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
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tweets..."
          className="w-full pl-10 pr-10 py-2.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--card-border)] theme-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 theme-card rounded-lg p-1 border">
          {(['all', 'unposted', 'posted'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
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
          onClick={() => fetchTweets({ refresh: true, targetPage: 1 })}
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
            onClick={() => fetchTweets({ refresh: true, targetPage: 1 })}
            className="mt-4 theme-accent-text hover:opacity-80"
          >
            Refresh to fetch tweets
          </button>
        </div>
      ) : (
        <>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--card-border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1]) > 1) acc.push('ellipsis')
                  acc.push(p)
                  return acc
                }, [])
                .map((item, i) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-1 theme-muted">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item)}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                        page === item
                          ? 'bg-[var(--accent)] text-white'
                          : 'border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--card-border)]'
                      )}
                    >
                      {item}
                    </button>
                  )
                )}

              {hasMoreOlder && (
                <span key="more-ellipsis" className="px-1 theme-muted">...</span>
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages && !hasMoreOlder}
                className={cn(
                  'p-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--card-border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
                  loadingOlder && 'opacity-50 pointer-events-none'
                )}
              >
                {loadingOlder ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              <span className="ml-3 text-xs theme-muted">{totalCount} tweets</span>
            </div>
          )}
        </>
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
