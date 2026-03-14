'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { cn } from '@/lib/utils'
import {
  Home, ChefHat, Trophy, ShoppingBag, Target, Users, LogOut
} from 'lucide-react'
import { useActiveMascot, useBalance } from '@/components/mascot-provider'

interface NavbarProps {
  profile: User | null
  activeMascot: string
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const activeMascot = useActiveMascot()
  const balance = useBalance()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Головна' },
    { href: '/generate', icon: ChefHat, label: 'Рецепти' },
    { href: '/challenges', icon: Target, label: 'Квести' },
    { href: '/leaderboard', icon: Trophy, label: 'Рейтинг' },
    { href: '/shop', icon: ShoppingBag, label: 'Магазин' },
  ]

  return (
    <>
      {/* Top bar - minimal */}
      <nav className="bg-[#1a1a2e]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="flex items-center gap-2 font-bold text-orange-400 text-lg">
              <span className="text-xl">🍳</span>
              <span className="text-sm font-extrabold tracking-wide">COOKQUEST</span>
            </Link>

            <div className="flex items-center gap-2">
              {profile && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-bold">
                    <span>💰</span> {balance}
                  </div>
                  <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold">
                    <span>🏆</span> {profile.rating_score}
                  </div>
                </div>
              )}
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-500/30 hover:border-orange-500 transition-colors flex-shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/mascots/${activeMascot}_happy.png`}
                  alt=""
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </Link>
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom tab bar - Duolingo style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e]/95 backdrop-blur-md border-t border-white/5">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                    isActive
                      ? 'text-orange-400'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-orange-500/20 shadow-[0_0_12px_rgba(255,107,53,0.2)]'
                      : 'hover:bg-white/5'
                  )}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
            <Link
              href="/friends"
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                pathname === '/friends'
                  ? 'text-orange-400'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                pathname === '/friends'
                  ? 'bg-orange-500/20 shadow-[0_0_12px_rgba(255,107,53,0.2)]'
                  : 'hover:bg-white/5'
              )}>
                <Users size={20} strokeWidth={pathname === '/friends' ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium">Друзі</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
