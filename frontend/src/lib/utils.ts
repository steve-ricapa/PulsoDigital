import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    low: 'bg-success-100 text-success-600',
    moderate: 'bg-warning-100 text-warning-600',
    high: 'bg-accent-100 text-accent-600',
    critical: 'bg-danger-100 text-danger-600',
  }
  return colors[level] || 'bg-primary-50 text-primary-600'
}

export function getRiskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    low: 'Bajo',
    moderate: 'Moderado',
    high: 'Alto',
    critical: 'Crítico',
  }
  return labels[level] || level
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateWellbeingColor(score: number): string {
  if (score >= 0.8) return 'text-success-600'
  if (score >= 0.6) return 'text-primary-600'
  if (score >= 0.4) return 'text-warning-600'
  return 'text-danger-600'
}