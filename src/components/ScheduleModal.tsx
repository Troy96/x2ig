'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Calendar, Palette, Loader2, Sparkles, ImageIcon, Instagram, ChevronLeft, Clock, AlertCircle } from 'lucide-react'
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

type PostType = 'STORY' | 'POST'
type Step = 'format' | 'datetime' | 'theme'

interface DatePreset {
  label: string
  getDate: () => Date
}

const datePresets: DatePreset[] = [
  {
    label: 'Today',
    getDate: () => {
      const d = new Date()
      d.setHours(18, 0, 0, 0) // 6 PM today
      return d
    },
  },
  {
    label: 'Tomorrow',
    getDate: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(10, 0, 0, 0) // 10 AM tomorrow
      return d
    },
  },
  {
    label: 'This Weekend',
    getDate: () => {
      const d = new Date()
      const day = d.getDay()
      const daysUntilSaturday = day === 0 ? 6 : 6 - day
      d.setDate(d.getDate() + daysUntilSaturday)
      d.setHours(12, 0, 0, 0) // Noon on Saturday
      return d
    },
  },
  {
    label: 'Next Week',
    getDate: () => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      d.setHours(10, 0, 0, 0) // 10 AM next week
      return d
    },
  },
]

export function ScheduleModal({ tweet, onClose, onScheduled }: ScheduleModalProps) {
  const { getThemeForDate } = useStoryTheme()
  const [step, setStep] = useState<Step>('format')
  const [postType, setPostType] = useState<PostType>('STORY')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [theme, setTheme] = useState<StoryTheme | 'auto'>('auto')
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instagramConnected, setInstagramConnected] = useState<boolean | null>(null)
  const [checkingInstagram, setCheckingInstagram] = useState(false)

  const getScheduledDate = () => {
    if (!date || !time) return null
    return new Date(`${date}T${time}`)
  }

  const getEffectiveTheme = (): StoryTheme => {
    if (theme !== 'auto') return theme
    const scheduledDate = getScheduledDate()
    return scheduledDate ? getThemeForDate(scheduledDate) : 'SHINY_PURPLE'
  }

  // Check Instagram connection when POST is selected
  useEffect(() => {
    if (postType === 'POST' && instagramConnected === null) {
      checkInstagramConnection()
    }
  }, [postType, instagramConnected])

  const checkInstagramConnection = async () => {
    setCheckingInstagram(true)
    try {
      const response = await fetch('/api/instagram/account')
      const data = await response.json()
      setInstagramConnected(!!data.account)
    } catch {
      setInstagramConnected(false)
    } finally {
      setCheckingInstagram(false)
    }
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

  const handlePresetSelect = (preset: DatePreset) => {
    const presetDate = preset.getDate()
    // If preset date is in the past, adjust to tomorrow
    if (presetDate < new Date()) {
      presetDate.setDate(presetDate.getDate() + 1)
    }
    setDate(presetDate.toISOString().split('T')[0])
    setTime(presetDate.toTimeString().slice(0, 5))
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
          theme: getEffectiveTheme(),
          postType,
          previewUrl: preview,
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

  const handleFormatSelect = (type: PostType) => {
    setPostType(type)
    if (type === 'POST') {
      // Check Instagram connection before proceeding
      if (instagramConnected === null) {
        checkInstagramConnection()
      }
    }
    setStep('datetime')
  }

  const handleBack = () => {
    if (step === 'datetime') setStep('format')
    else if (step === 'theme') setStep('datetime')
  }

  const handleNext = () => {
    if (step === 'datetime') setStep('theme')
  }

  const effectiveTheme = getEffectiveTheme()
  const effectiveThemeData = storyThemes.find(t => t.id === effectiveTheme)

  const stepTitles: Record<Step, string> = {
    format: 'Choose Format',
    datetime: 'Schedule Time',
    theme: 'Theme & Preview',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--card-border)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--card-border)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== 'format' && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-[var(--card-border)] transition-colors theme-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold">{stepTitles[step]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors theme-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Format Selection */}
          {step === 'format' && (
            <div className="space-y-6">
              {/* Tweet Preview */}
              <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--card-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{tweet.authorName}</span>
                  <span className="theme-muted text-sm">@{tweet.authorUsername}</span>
                </div>
                <p className="opacity-80 text-sm line-clamp-3">{tweet.text}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm theme-muted">How do you want to post this?</p>

                {/* Story Option */}
                <button
                  onClick={() => handleFormatSelect('STORY')}
                  className={cn(
                    'w-full p-4 rounded-xl border transition-all text-left',
                    'border-[var(--card-border)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[var(--background)] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 theme-muted" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Story</h3>
                      <p className="text-sm theme-muted">
                        Generate a screenshot and download it to post manually to your Instagram Story
                      </p>
                    </div>
                  </div>
                </button>

                {/* Post Option */}
                <button
                  onClick={() => handleFormatSelect('POST')}
                  className={cn(
                    'w-full p-4 rounded-xl border transition-all text-left',
                    'border-[var(--card-border)] hover:border-purple-500 hover:bg-purple-500/10'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Instagram className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Auto Post</h3>
                      <p className="text-sm theme-muted">
                        Automatically post to your Instagram feed at the scheduled time
                      </p>
                      <p className="text-xs text-purple-400 mt-1">
                        Requires Instagram Business/Creator account
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-6">
              {/* Instagram Connection Warning for POST type */}
              {postType === 'POST' && (
                <div className={cn(
                  'p-4 rounded-xl border',
                  checkingInstagram
                    ? 'bg-[var(--background)] border-[var(--card-border)]'
                    : instagramConnected
                      ? 'bg-[var(--success-muted)] border-[var(--success-text)]/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                )}>
                  {checkingInstagram ? (
                    <div className="flex items-center gap-2 text-sm theme-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Instagram connection...
                    </div>
                  ) : instagramConnected ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--success-text)]">
                      <Instagram className="w-4 h-4" />
                      Instagram account connected
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-500">Instagram not connected</p>
                        <p className="text-xs theme-muted mt-1">
                          Connect your Instagram Business/Creator account in Settings to enable auto-posting.
                          You can still schedule now and connect later.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium theme-muted mb-3">
                  Quick Select
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {datePresets.map((preset) => {
                    const presetDate = preset.getDate()
                    const isPast = presetDate < new Date()
                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePresetSelect(preset)}
                        disabled={isPast && preset.label === 'Today'}
                        className={cn(
                          'p-3 rounded-lg border text-sm font-medium transition-all',
                          'border-[var(--card-border)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Date & Time */}
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
                    <Clock className="w-4 h-4 inline mr-1" />
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

              {/* Selected DateTime Preview */}
              {date && time && (
                <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--card-border)]">
                  <p className="text-sm theme-muted">Scheduled for:</p>
                  <p className="font-medium">
                    {new Date(`${date}T${time}`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 border border-[var(--card-border)] theme-muted rounded-lg hover:bg-[var(--background)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!date || !time}
                  className="flex-1 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Theme & Preview */}
          {step === 'theme' && (
            <div className="space-y-6">
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
                  <span className="text-sm font-medium">Preview</span>
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

              {/* Summary */}
              <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--card-border)] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="theme-muted">Format</span>
                  <span className="font-medium flex items-center gap-1.5">
                    {postType === 'POST' ? (
                      <>
                        <Instagram className="w-4 h-4 text-purple-400" />
                        Auto Post
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Story
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="theme-muted">Scheduled</span>
                  <span className="font-medium">
                    {new Date(`${date}T${time}`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="theme-muted">Theme</span>
                  <span className="font-medium flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: effectiveThemeData?.gradient }}
                    />
                    {effectiveThemeData?.name}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 border border-[var(--card-border)] theme-muted rounded-lg hover:bg-[var(--background)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={submitting || !date || !time}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                    postType === 'POST'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                      : 'bg-[var(--accent)] text-white hover:opacity-90'
                  )}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule {postType === 'POST' ? 'Auto Post' : 'Story'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
