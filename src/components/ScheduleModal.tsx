'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Calendar, Palette, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStoryTheme, storyThemes, StoryTheme } from '@/contexts/StoryThemeContext'

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

export function ScheduleModal({ tweet, onClose, onScheduled }: ScheduleModalProps) {
  const { getThemeForDate } = useStoryTheme()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [theme, setTheme] = useState<StoryTheme | 'auto'>('auto')
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getScheduledDate = () => {
    if (!date || !time) return null
    return new Date(`${date}T${time}`)
  }

  const getEffectiveTheme = (): StoryTheme => {
    if (theme !== 'auto') return theme
    const scheduledDate = getScheduledDate()
    return scheduledDate ? getThemeForDate(scheduledDate) : 'SHINY_PURPLE'
  }

  // Set default date/time to tomorrow at 10am
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    setDate(tomorrow.toISOString().split('T')[0])
    setTime('10:00')
  }, [])

  // Clear preview when theme or date changes
  useEffect(() => {
    setPreview(null)
  }, [theme, date])

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
          theme: getEffectiveTheme(),
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

  const effectiveTheme = getEffectiveTheme()
  const effectiveThemeData = storyThemes.find(t => t.id === effectiveTheme)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--card-border)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--card-border)] p-4 flex items-center justify-between">
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
              Story Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Auto Option */}
              <button
                onClick={() => setTheme('auto')}
                className={cn(
                  'p-3 rounded-lg border transition-all text-sm font-medium text-left',
                  theme === 'auto'
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--card-border)] hover:border-[var(--muted)]'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Auto</span>
                </div>
                <span className="text-xs opacity-60 block">
                  Based on settings
                </span>
              </button>

              {/* Theme Options */}
              {storyThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'p-3 rounded-lg border transition-all text-sm font-medium text-left',
                    theme === t.id
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--card-border)] hover:border-[var(--muted)]'
                  )}
                >
                  <div
                    className="w-full h-6 rounded mb-2"
                    style={{ background: t.gradient }}
                  />
                  <span className="block truncate">{t.name}</span>
                </button>
              ))}
            </div>

            {/* Show effective theme when Auto is selected */}
            {theme === 'auto' && date && (
              <p className="mt-2 text-xs theme-muted flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: effectiveThemeData?.gradient }}
                />
                Will use <span className="font-medium">{effectiveThemeData?.name}</span> for {new Date(`${date}T12:00`).toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
            )}
          </div>

          {/* Story Preview */}
          <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Story Preview</span>
              <button
                onClick={handleGeneratePreview}
                disabled={loadingPreview}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
            <div className="aspect-square max-w-[280px] mx-auto bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden flex items-center justify-center">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={280}
                  height={280}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <div
                    className="w-16 h-16 rounded-lg mx-auto mb-3 opacity-50"
                    style={{ background: effectiveThemeData?.gradient || storyThemes[0].gradient }}
                  />
                  <span className="theme-muted text-sm">
                    Click Generate to preview
                  </span>
                </div>
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
