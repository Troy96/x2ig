'use client'

import Image from 'next/image'
import {
  Clock,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Instagram,
  ImageIcon,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

export interface ScheduledPostCardProps {
  id: string
  tweet: {
    id: string
    text: string
    authorName: string
    authorUsername: string
  }
  scheduledFor: string
  theme: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  postType: 'STORY' | 'POST'
  screenshotUrl?: string | null
  previewUrl?: string | null
  instagramPostId?: string | null
  postedAt?: string | null
  errorMessage?: string | null
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onMarkPosted: (id: string) => void
  onProcess: (id: string) => void
}

const statusConfig = {
  PENDING: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-blue-500/10 text-blue-500',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-yellow-500/10 text-yellow-500',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-[var(--success-muted)] text-[var(--success-text)]',
  },
  FAILED: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500',
  },
}

const themeLabels: Record<string, string> = {
  SHINY_PURPLE: 'Shiny Purple',
  MANGO_JUICE: 'Mango Juice',
}

const themeGradients: Record<string, string> = {
  SHINY_PURPLE: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  MANGO_JUICE: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f6d365 100%)',
}

export function ScheduledPostCard({
  id,
  tweet,
  scheduledFor,
  theme,
  status,
  postType,
  screenshotUrl,
  previewUrl,
  instagramPostId,
  errorMessage,
  onCancel,
  onRetry,
  onMarkPosted,
  onProcess,
}: ScheduledPostCardProps) {
  const StatusIcon = statusConfig[status].icon
  const isProcessing = status === 'PROCESSING'

  // Use screenshotUrl if available (completed), otherwise fall back to previewUrl
  const displayImageUrl = screenshotUrl || previewUrl

  const handleDownload = async () => {
    const downloadUrl = screenshotUrl || previewUrl
    if (!downloadUrl) return

    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `x2ig-${tweet.authorUsername}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="theme-card border rounded-xl overflow-hidden">
      {/* Screenshot Preview */}
      <div
        className="relative h-[180px]"
        style={{ background: themeGradients[theme] || themeGradients.SHINY_PURPLE }}
      >
        {displayImageUrl ? (
          <Image
            src={displayImageUrl}
            alt="Screenshot preview"
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white text-center">
              <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-80" />
              <span className="text-xs opacity-80">
                {status === 'PENDING' ? 'Awaiting processing' : 'No preview'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Status Badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            statusConfig[status].className
          )}>
            <StatusIcon className={cn('w-3 h-3', isProcessing && 'animate-spin')} />
            {statusConfig[status].label}
          </div>

          {/* Post Type Badge */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            postType === 'POST'
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-[var(--card-border)] theme-muted'
          )}>
            {postType === 'POST' ? (
              <>
                <Instagram className="w-3 h-3" />
                Auto
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3" />
                Story
              </>
            )}
          </div>
        </div>

        {/* Tweet Preview */}
        <p className="text-sm line-clamp-2 mb-3">
          {tweet.text}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs theme-muted mb-3">
          <span>@{tweet.authorUsername}</span>
          <span className="opacity-50">·</span>
          <span>{themeLabels[theme] || theme}</span>
        </div>

        {/* Scheduled Time */}
        <div className="flex items-center gap-2 text-sm theme-muted mb-4">
          <Clock className="w-4 h-4" />
          <span>{formatDate(new Date(scheduledFor))}</span>
        </div>

        {/* Error Message */}
        {status === 'FAILED' && errorMessage && (
          <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mb-3">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--card-border)]">
          {status === 'PENDING' && previewUrl && (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => onProcess(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </button>
              <button
                onClick={() => onCancel(id)}
                className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-colors"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {status === 'PENDING' && !previewUrl && (
            <button
              onClick={() => onCancel(id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Cancel
            </button>
          )}

          {status === 'COMPLETED' && postType === 'STORY' && (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => onMarkPosted(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Posted
              </button>
            </>
          )}

          {status === 'COMPLETED' && postType === 'POST' && instagramPostId && (
            <a
              href={`https://www.instagram.com/p/${instagramPostId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              View on Instagram
            </a>
          )}

          {status === 'FAILED' && (
            <>
              <button
                onClick={() => onRetry(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => onCancel(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
