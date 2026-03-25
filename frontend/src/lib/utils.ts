import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatAmount(amount: number, decimals = 7): string {
  return amount.toFixed(decimals)
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}