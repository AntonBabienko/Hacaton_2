import { cookies } from 'next/headers'
import { dictionaries, type Locale, type Dictionary } from './dictionaries'

export const defaultLocale = 'en'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value
  
  if (localeCookie === 'en' || localeCookie === 'uk') {
    return localeCookie as Locale
  }
  
  return defaultLocale
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale()
  return dictionaries[locale]
}
