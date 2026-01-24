import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

export function getDefaultTheme(date: Date = new Date()): 'SHINY_PURPLE' | 'MANGO_JUICE' {
  return isSunday(date) ? 'MANGO_JUICE' : 'SHINY_PURPLE'
}
