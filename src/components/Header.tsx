'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Bell, Settings } from 'lucide-react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
            x2ig
          </span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            >
              <Bell className="w-5 h-5" />
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{session.user.name}</p>
                {session.user.xUsername && (
                  <p className="text-xs text-gray-500">@{session.user.xUsername}</p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
