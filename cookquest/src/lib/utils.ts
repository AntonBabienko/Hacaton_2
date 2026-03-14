import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LEVELS, CUISINES_SCHEDULE } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLevelInfo(xp: number) {
  const level = [...LEVELS].reverse().find(l => xp >= l.min_xp) || LEVELS[0]
  return level
}

export function getXpProgress(xp: number) {
  const level = getLevelInfo(xp)
  if (level.max_xp === Infinity) return 100
  const progress = ((xp - level.min_xp) / (level.max_xp - level.min_xp)) * 100
  return Math.min(Math.max(progress, 0), 100)
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getCurrentCuisine(): string {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return CUISINES_SCHEDULE[weekNumber % CUISINES_SCHEDULE.length]
}

export function getTodayChallengeCuisine(): string {
  return getCurrentCuisine()
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      } else if (height > maxWidth) {
        width = (width * maxWidth) / height
        height = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/jpeg', quality)
    }
    img.onerror = reject
  })
}
