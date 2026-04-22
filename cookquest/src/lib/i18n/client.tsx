'use client'

import React, { createContext, useContext } from 'react'
import type { Dictionary, Locale } from './dictionaries'

interface I18nContextProps {
  t: Dictionary
  locale: Locale
}

const I18nContext = createContext<I18nContextProps | null>(null)

export function I18nProvider({ 
  children, 
  dictionary,
  locale 
}: { 
  children: React.ReactNode
  dictionary: Dictionary
  locale: Locale
}) {
  return (
    <I18nContext.Provider value={{ t: dictionary, locale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
