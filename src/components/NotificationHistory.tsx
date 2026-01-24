'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Bell, CheckCircle, XCircle, Trash2, Check, RefreshCw } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Notification {
  id: string
  type: 'POST_READY' | 'POST_FAILED' | 'REMINDER'
  title: string
  body: string
  imageUrl: string | null
  postId: string | null
  read: boolean
  sentAt: string
}

export function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      const data = await response.json()

      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id) ? { ...n, read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - ids.length))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })

      const notification = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'POST_READY':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'POST_FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'REMINDER':
        return <Bell className="w-5 h-5 text-blue-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'flex gap-4 p-4 rounded-xl border transition-colors',
                notification.read
                  ? 'bg-gray-900/30 border-gray-800'
                  : 'bg-gray-900 border-gray-700'
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={cn(
                      'font-medium',
                      notification.read ? 'text-gray-400' : 'text-white'
                    )}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {formatDate(new Date(notification.sentAt))}
                    </p>
                  </div>

                  {notification.imageUrl && (
                    <div className="flex-shrink-0">
                      <Image
                        src={notification.imageUrl}
                        alt="Screenshot"
                        width={60}
                        height={60}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-3">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead([notification.id])}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Mark as read
                    </button>
                  )}
                  {notification.imageUrl && (
                    <a
                      href={notification.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View image
                    </a>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-xs text-gray-500 hover:text-red-400 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
