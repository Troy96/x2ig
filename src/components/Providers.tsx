'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { StoryThemeProvider } from '@/contexts/StoryThemeContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <StoryThemeProvider>{children}</StoryThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
