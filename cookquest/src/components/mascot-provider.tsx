'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_MASCOT } from '@/lib/constants'

const STORAGE_KEY = 'cq_mascot'

interface MascotContextValue {
  activeMascot: string
  setActiveMascot: (key: string) => void
}

const MascotContext = createContext<MascotContextValue>({
  activeMascot: DEFAULT_MASCOT,
  setActiveMascot: () => {},
})

export function MascotProvider({ mascot, children }: { mascot: string; children: React.ReactNode }) {
  // Always start with server value to avoid hydration mismatch
  const [activeMascot, setActiveMascotState] = useState(mascot)

  // After hydration: read localStorage preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored !== mascot) setActiveMascotState(stored)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setActiveMascot(key: string) {
    localStorage.setItem(STORAGE_KEY, key)
    setActiveMascotState(key)
  }

  return (
    <MascotContext.Provider value={{ activeMascot, setActiveMascot }}>
      {children}
    </MascotContext.Provider>
  )
}

export function useActiveMascot(): string {
  return useContext(MascotContext).activeMascot
}

export function useSetActiveMascot(): (key: string) => void {
  return useContext(MascotContext).setActiveMascot
}
