'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_MASCOT } from '@/lib/constants'

const MascotContext = createContext<string>(DEFAULT_MASCOT)

export function MascotProvider({ mascot, children }: { mascot: string; children: React.ReactNode }) {
  return <MascotContext.Provider value={mascot}>{children}</MascotContext.Provider>
}

export function useActiveMascot(): string {
  return useContext(MascotContext)
}
