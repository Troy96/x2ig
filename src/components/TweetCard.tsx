'use client'

import Image from 'next/image'
import { Heart, MessageCircle, Repeat2, CheckCircle, Calendar } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

export interface TweetCardProps {
  id: string
  tweetId: string
  text: string
  authorName: string
  authorUsername: string
  authorImage?: string | null
  likeCount: number
  retweetCount: number
  replyCount: number
  createdAt: string | Date
  mediaUrls?: string[]
  isPosted: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  onSchedule: (id: string) => void
}

export function TweetCard({
  id,
  text,
  authorName,
  authorUsername,
  likeCount,
  retweetCount,
  replyCount,
  createdAt,
  mediaUrls,
  isPosted,
  isSelected,
  onSelect,
  onSchedule,
}: TweetCardProps) {
  const handleClick = () => {
    if (!isPosted) {
      onSelect(id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative theme-card border rounded-xl p-4 transition-all cursor-pointer',
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent-muted)]'
          : 'hover:border-[var(--muted)]',
        isPosted && 'opacity-60 cursor-default'
      )}
    >
      {isPosted && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[var(--success-text)] text-xs font-medium">
          <CheckCircle className="w-4 h-4" />
          Posted
        </div>
      )}

      {isSelected && !isPosted && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm">{authorName}</span>
          <span className="theme-muted text-sm">@{authorUsername}</span>
        </div>

          <p className="mt-1 whitespace-pre-wrap break-words opacity-90">
            {text}
          </p>

          {mediaUrls && mediaUrls.length > 0 && (
            <div className="mt-3 grid gap-2 grid-cols-2">
              {mediaUrls.slice(0, 4).map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-lg overflow-hidden bg-[var(--card-border)]"
                >
                  <Image
                    src={url}
                    alt={`Media ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 theme-muted text-sm">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {replyCount}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="w-4 h-4" />
              {retweetCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {likeCount}
            </span>
            <span className="ml-auto text-xs">
              {formatDate(new Date(createdAt))}
            </span>
          </div>

        {!isPosted && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSchedule(id)
            }}
            className="mt-3 flex items-center gap-2 text-sm theme-accent-text hover:opacity-80 transition-opacity"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        )}
      </div>
    </div>
  )
}
