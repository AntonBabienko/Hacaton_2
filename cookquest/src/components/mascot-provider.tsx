'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_MASCOT } from '@/lib/constants'

const STORAGE_KEY = 'cq_mascot'

interface AppContextValue {
  activeMascot: string
  setActiveMascot: (key: string) => void
  balance: number
  setBalance: (b: number | ((prev: number) => number)) => void
}

const AppContext = createContext<AppContextValue>({
  activeMascot: DEFAULT_MASCOT,
  setActiveMascot: () => {},
  balance: 0,
  setBalance: () => {},
})

export function MascotProvider({ mascot, balance: initialBalance, children }: { mascot: string; balance: number; children: React.ReactNode }) {
  // Always start with server value to avoid hydration mismatch
  const [activeMascot, setActiveMascotState] = useState(mascot)
  const [balance, setBalance] = useState(initialBalance)

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
    <AppContext.Provider value={{ activeMascot, setActiveMascot, balance, setBalance }}>
      {children}
    </AppContext.Provider>
  )
}

export function useActiveMascot(): string {
  return useContext(AppContext).activeMascot
}

export function useSetActiveMascot(): (key: string) => void {
  return useContext(AppContext).setActiveMascot
}

export function useBalance(): number {
  return useContext(AppContext).balance
}

export function useSetBalance(): (b: number | ((prev: number) => number)) => void {
  return useContext(AppContext).setBalance
}
