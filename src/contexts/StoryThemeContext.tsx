'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type StoryTheme = 'SHINY_PURPLE' | 'MANGO_JUICE' | 'OCEAN_BREEZE' | 'FOREST_GLOW' | 'SUNSET_VIBES'

export const storyThemes: {
  id: StoryTheme
  name: string
  gradient: string
  colors: [string, string] | [string, string, string]
}[] = [
  {
    id: 'SHINY_PURPLE',
    name: 'Shiny Purple',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    colors: ['#667eea', '#764ba2']
  },
  {
    id: 'MANGO_JUICE',
    name: 'Mango Juice',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f9a825 100%)',
    colors: ['#f093fb', '#f5576c', '#f9a825']
  },
  {
    id: 'OCEAN_BREEZE',
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #667eea 0%, #64b5f6 50%, #4dd0e1 100%)',
    colors: ['#667eea', '#64b5f6', '#4dd0e1']
  },
  {
    id: 'FOREST_GLOW',
    name: 'Forest Glow',
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    colors: ['#134e5e', '#71b280']
  },
  {
    id: 'SUNSET_VIBES',
    name: 'Sunset Vibes',
    gradient: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    colors: ['#fc4a1a', '#f7b733']
  },
]

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

export const daysOfWeek: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
]

export type DayThemeMapping = Record<DayOfWeek, StoryTheme>

const defaultDayThemeMapping: DayThemeMapping = {
  sunday: 'MANGO_JUICE',
  monday: 'SHINY_PURPLE',
  tuesday: 'SHINY_PURPLE',
  wednesday: 'OCEAN_BREEZE',
  thursday: 'SHINY_PURPLE',
  friday: 'SUNSET_VIBES',
  saturday: 'FOREST_GLOW',
}

interface StoryThemeContextType {
  dayThemeMapping: DayThemeMapping
  setDayTheme: (day: DayOfWeek, theme: StoryTheme) => void
  getThemeForDate: (date: Date) => StoryTheme
}

const StoryThemeContext = createContext<StoryThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'x2ig-day-theme-mapping'

export function StoryThemeProvider({ children }: { children: ReactNode }) {
  const [dayThemeMapping, setDayThemeMapping] = useState<DayThemeMapping>(defaultDayThemeMapping)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setDayThemeMapping({ ...defaultDayThemeMapping, ...parsed })
      } catch {
        // Ignore invalid JSON
      }
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dayThemeMapping))
    }
  }, [dayThemeMapping, mounted])

  const setDayTheme = (day: DayOfWeek, theme: StoryTheme) => {
    setDayThemeMapping(prev => ({ ...prev, [day]: theme }))
  }

  const getThemeForDate = (date: Date): StoryTheme => {
    const dayIndex = date.getDay()
    const dayKey = daysOfWeek[dayIndex].id
    return dayThemeMapping[dayKey]
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <StoryThemeContext.Provider value={{ dayThemeMapping, setDayTheme, getThemeForDate }}>
      {children}
    </StoryThemeContext.Provider>
  )
}

export function useStoryTheme() {
  const context = useContext(StoryThemeContext)
  if (context === undefined) {
    throw new Error('useStoryTheme must be used within a StoryThemeProvider')
  }
  return context
}
