'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Clock, Palette, Loader2 } from 'lucide-react'
import { cn, getDefaultTheme, formatDate } from '@/lib/utils'

interface Tweet {
  id: string
  tweetId: string
  text: string
  authorName: string
  authorUsername: string
  authorImage: string | null
}

interface BulkScheduleModalProps {
  tweets: Tweet[]
  onClose: () => void
  onScheduled: () => void
}

interface ScheduleSlot {
  date: string
  time: string
  theme: 'SHINY_PURPLE' | 'MANGO_JUICE' | 'auto'
  tweetId: string
}

type Theme = 'SHINY_PURPLE' | 'MANGO_JUICE' | 'auto'

export function BulkScheduleModal({ tweets, onClose, onScheduled }: BulkScheduleModalProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [globalTheme, setGlobalTheme] = useState<Theme>('auto')

  // Initialize slots with default times (30 min apart starting tomorrow at 10am)
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const initialSlots: ScheduleSlot[] = tweets.map((tweet, index) => {
      const slotTime = new Date(tomorrow)
      slotTime.setMinutes(slotTime.getMinutes() + index * 30)

      return {
        date: slotTime.toISOString().split('T')[0],
        time: slotTime.toTimeString().slice(0, 5),
        theme: 'auto',
        tweetId: tweet.id,
      }
    })

    setSlots(initialSlots)
  }, [tweets])

  const updateSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    )
  }

  const applyGlobalTheme = () => {
    setSlots((prev) =>
      prev.map((slot) => ({ ...slot, theme: globalTheme }))
    )
  }

  const distributeEvenly = () => {
    if (slots.length < 2) return

    const startDate = new Date(`${slots[0].date}T${slots[0].time}`)
    const interval = 60 // 60 minutes apart

    setSlots((prev) =>
      prev.map((slot, index) => {
        const slotTime = new Date(startDate)
        slotTime.setMinutes(slotTime.getMinutes() + index * interval)

        return {
          ...slot,
          date: slotTime.toISOString().split('T')[0],
          time: slotTime.toTimeString().slice(0, 5),
        }
      })
    )
  }

  const getEffectiveTheme = (slot: ScheduleSlot): 'SHINY_PURPLE' | 'MANGO_JUICE' => {
    if (slot.theme !== 'auto') return slot.theme
    const scheduledDate = new Date(`${slot.date}T${slot.time}`)
    return getDefaultTheme(scheduledDate)
  }

  const handleSchedule = async () => {
    // Validate all slots
    for (const slot of slots) {
      const scheduledDate = new Date(`${slot.date}T${slot.time}`)
      if (scheduledDate < new Date()) {
        setError('All scheduled times must be in the future')
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      // Schedule each post individually with its own time
      for (const slot of slots) {
        const scheduledDate = new Date(`${slot.date}T${slot.time}`)
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweets: [slot.tweetId],
            scheduledFor: scheduledDate.toISOString(),
            theme: slot.theme === 'auto' ? undefined : slot.theme,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to schedule post')
        }
      }

      onScheduled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule posts')
    } finally {
      setSubmitting(false)
    }
  }

  const getTweetById = (tweetId: string) => tweets.find((t) => t.id === tweetId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--card)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--card-border)]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--card-border)] p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">
            Schedule {tweets.length} Posts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors theme-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--background)] rounded-xl border border-[var(--card-border)]">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 theme-muted" />
              <select
                value={globalTheme}
                onChange={(e) => setGlobalTheme(e.target.value as Theme)}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="auto">Auto Theme</option>
                <option value="SHINY_PURPLE">Shiny Purple</option>
                <option value="MANGO_JUICE">Mango Juice</option>
              </select>
              <button
                onClick={applyGlobalTheme}
                className="text-sm theme-accent-text hover:opacity-80"
              >
                Apply to All
              </button>
            </div>
            <div className="h-6 w-px bg-[var(--card-border)]" />
            <button
              onClick={distributeEvenly}
              className="flex items-center gap-2 text-sm theme-accent-text hover:opacity-80"
            >
              <Clock className="w-4 h-4" />
              Distribute 1 Hour Apart
            </button>
          </div>

          {/* Schedule Slots */}
          <div className="space-y-4">
            {slots.map((slot, index) => {
              const tweet = getTweetById(slot.tweetId)
              if (!tweet) return null

              return (
                <div
                  key={slot.tweetId}
                  className="flex gap-4 p-4 bg-[var(--background)] rounded-xl border border-[var(--card-border)]"
                >
                  {/* Tweet Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-sm font-medium text-white">
                        {index + 1}
                      </span>
                      {tweet.authorImage ? (
                        <Image
                          src={tweet.authorImage}
                          alt={tweet.authorName}
                          width={32}
                          height={32}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--card-border)] flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {tweet.authorName}
                          </span>
                          <span className="theme-muted text-sm">
                            @{tweet.authorUsername}
                          </span>
                        </div>
                        <p className="mt-1 theme-muted text-sm line-clamp-2">
                          {tweet.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Controls */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateSlot(index, 'date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(index, 'time', e.target.value)}
                      className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                    <select
                      value={slot.theme}
                      onChange={(e) => updateSlot(index, 'theme', e.target.value)}
                      className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="auto">Auto</option>
                      <option value="SHINY_PURPLE">Purple</option>
                      <option value="MANGO_JUICE">Mango</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--card-border)]">
            <h3 className="text-sm font-medium theme-muted mb-2">Schedule Summary</h3>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot, index) => {
                const scheduledDate = new Date(`${slot.date}T${slot.time}`)
                const theme = getEffectiveTheme(slot)
                return (
                  <span
                    key={slot.tweetId}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      theme === 'SHINY_PURPLE'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-orange-500/20 text-orange-400'
                    )}
                  >
                    #{index + 1}: {formatDate(scheduledDate)}
                  </span>
                )
              })}
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
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Schedule All ({tweets.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
