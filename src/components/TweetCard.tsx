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
  authorImage,
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
        'relative bg-gray-900 border rounded-xl p-4 transition-all cursor-pointer',
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-500/20'
          : 'border-gray-800 hover:border-gray-700',
        isPosted && 'opacity-60 cursor-default'
      )}
    >
      {isPosted && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-green-500 text-xs font-medium">
          <CheckCircle className="w-4 h-4" />
          Posted
        </div>
      )}

      {isSelected && !isPosted && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
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
          <span className="font-semibold text-white text-sm">{authorName}</span>
          <span className="text-gray-500 text-sm">@{authorUsername}</span>
        </div>

          <p className="mt-1 text-gray-300 whitespace-pre-wrap break-words">
            {text}
          </p>

          {mediaUrls && mediaUrls.length > 0 && (
            <div className="mt-3 grid gap-2 grid-cols-2">
              {mediaUrls.slice(0, 4).map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-800"
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

          <div className="mt-3 flex items-center gap-4 text-gray-500 text-sm">
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
            className="mt-3 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        )}
      </div>
    </div>
  )
}
