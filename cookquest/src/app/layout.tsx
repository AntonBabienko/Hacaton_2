import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { I18nProvider } from '@/lib/i18n/client'
import { getDictionary, getLocale } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'CookQuest — Готуй. Змагайся. Перемагай.',
  description: 'Гейміфікація готування їжі з AI',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const dictionary = await getDictionary()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider dictionary={dictionary} locale={locale}>
          {children}
          <Toaster richColors position="top-right" />
        </I18nProvider>
      </body>
    </html>
  )
}
