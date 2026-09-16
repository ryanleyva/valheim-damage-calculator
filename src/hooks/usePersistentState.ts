import { useEffect, useState } from 'react'

const PREFIX = 'valheim-calc:'

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw != null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Like useState, but persists the value in localStorage (survives page refresh) under a given key.
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback))

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage unavailable (private browsing, quota exceeded, etc.) - fail silently.
    }
  }, [key, value])

  return [value, setValue] as const
}
