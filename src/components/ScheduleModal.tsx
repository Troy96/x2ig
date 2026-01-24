'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Calendar, Palette, Loader2 } from 'lucide-react'
import { cn, getDefaultTheme } from '@/lib/utils'

interface Tweet {
  id: string
  tweetId: string
  text: string
  authorName: string
  authorUsername: string
  authorImage: string | null
}

interface ScheduleModalProps {
  tweet: Tweet
  onClose: () => void
  onScheduled: () => void
}

type Theme = 'SHINY_PURPLE' | 'MANGO_JUICE'

export function ScheduleModal({ tweet, onClose, onScheduled }: ScheduleModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [theme, setTheme] = useState<Theme | 'auto'>('auto')
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getScheduledDate = () => {
    if (!date || !time) return null
    return new Date(`${date}T${time}`)
  }

  const getEffectiveTheme = (): Theme => {
    if (theme !== 'auto') return theme
    const scheduledDate = getScheduledDate()
    return scheduledDate ? getDefaultTheme(scheduledDate) : 'SHINY_PURPLE'
  }

  const handleGeneratePreview = async () => {
    setLoadingPreview(true)
    setError(null)

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId: tweet.id,
          theme: getEffectiveTheme(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview')
      }

      setPreview(data.preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSchedule = async () => {
    const scheduledDate = getScheduledDate()
    if (!scheduledDate) {
      setError('Please select a date and time')
      return
    }

    if (scheduledDate < new Date()) {
      setError('Scheduled time must be in the future')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: [tweet.id],
          scheduledFor: scheduledDate.toISOString(),
          theme: theme === 'auto' ? undefined : theme,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule post')
      }

      onScheduled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule post')
    } finally {
      setSubmitting(false)
    }
  }

  // Set default date/time to tomorrow at 10am
  useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    setDate(tomorrow.toISOString().split('T')[0])
    setTime('10:00')
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--card-border)]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--card-border)] p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Schedule Post</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors theme-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tweet Preview */}
          <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--card-border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{tweet.authorName}</span>
              <span className="theme-muted text-sm">@{tweet.authorUsername}</span>
            </div>
            <p className="opacity-80 text-sm">{tweet.text}</p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium theme-muted mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-muted mb-2">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium theme-muted mb-2">
              <Palette className="w-4 h-4 inline mr-1" />
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('auto')}
                className={cn(
                  'p-3 rounded-lg border transition-all text-sm font-medium',
                  theme === 'auto'
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] theme-accent-text'
                    : 'border-[var(--card-border)] theme-muted hover:border-[var(--muted)]'
                )}
              >
                Auto
                <span className="block text-xs mt-1 opacity-60">
                  Based on day
                </span>
              </button>
              <button
                onClick={() => setTheme('SHINY_PURPLE')}
                className={cn(
                  'p-3 rounded-lg border transition-all text-sm font-medium',
                  theme === 'SHINY_PURPLE'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-[var(--card-border)] theme-muted hover:border-[var(--muted)]'
                )}
              >
                Shiny Purple
                <span className="block text-xs mt-1 opacity-60">
                  Weekdays
                </span>
              </button>
              <button
                onClick={() => setTheme('MANGO_JUICE')}
                className={cn(
                  'p-3 rounded-lg border transition-all text-sm font-medium',
                  theme === 'MANGO_JUICE'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-[var(--card-border)] theme-muted hover:border-[var(--muted)]'
                )}
              >
                Mango Juice
                <span className="block text-xs mt-1 opacity-60">
                  Sunday
                </span>
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium theme-muted">Preview</label>
              <button
                onClick={handleGeneratePreview}
                disabled={loadingPreview}
                className="text-sm theme-accent-text hover:opacity-80 disabled:opacity-50"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Preview'
                )}
              </button>
            </div>
            <div className="aspect-square max-w-[300px] mx-auto bg-[var(--background)] border border-[var(--card-border)] rounded-xl overflow-hidden flex items-center justify-center">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={300}
                  height={300}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="theme-muted text-sm text-center px-4 opacity-60">
                  Click &quot;Generate Preview&quot; to see how your post will look
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-[var(--danger-muted)] border border-[var(--danger)] rounded-lg text-[var(--danger-text)] text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--card-border)] theme-muted rounded-lg hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={submitting || !date || !time}
              className="flex-1 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
