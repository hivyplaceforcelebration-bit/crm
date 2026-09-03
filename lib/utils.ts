import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "16:00" -> "4:00 PM"
function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":")
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${period}`
}

// ("16:00", "18:00") -> "4:00 PM - 6:00 PM"
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12h(start)} - ${formatTime12h(end)}`
}
