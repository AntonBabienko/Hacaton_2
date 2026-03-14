'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShoppingBag, Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MASCOT_ITEMS, RARITY_COLORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'

interface Props {
  userId: string
  balance: number
  activeMascot: string
  ownedMascotKeys: string[]
}

export default function ShopContent({ userId, balance: initialBalance, activeMascot: initialActive, ownedMascotKeys }: Props) {
  const [balance, setBalance] = useState(initialBalance)
  const [owned, setOwned] = useState<Set<string>>(new Set([...ownedMascotKeys, 'broccoli'])) // broccoli is always free/owned
  const [activeMascot, setActiveMascot] = useState(initialActive)
  const [buying, setBuying] = useState<string | null>(null)
  const supabase = createClient()

  async function buyMascot(mascot: typeof MASCOT_ITEMS[number]) {
    if (balance < mascot.price) {
      toast.error('Недостатньо балів!')
      return
    }

    setBuying(mascot.key)
    try {
      // Record ownership
      const { error } = await supabase.from('user_mascots').insert({
        user_id: userId,
        mascot_key: mascot.key,
      })
      if (error) { toast.error('Помилка покупки'); return }

      // Deduct balance
      await supabase.from('profiles').update({ balance: balance - mascot.price }).eq('id', userId)

      setBalance(b => b - mascot.price)
      setOwned(prev => new Set([...prev, mascot.key]))
      toast.success(`${mascot.name} тепер твій!`)
    } finally {
      setBuying(null)
    }
  }

  async function equipMascot(key: string) {
    await supabase.from('profiles').update({ active_mascot: key }).eq('id', userId)
    setActiveMascot(key)
    toast.success('Маскот встановлено!')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <ShoppingBag size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Магазин маскотів</h1>
            <p className="text-xs text-gray-400">
              Баланс: <span className="text-yellow-400 font-bold text-sm">💰 {balance}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Active mascot preview */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-orange-500/20 p-4">
        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-2">Активний маскот</p>
        <div className="flex items-center gap-4">
          <Mascot
            name={activeMascot as any}
            mood="happy"
            size={72}
            animation="bounce"
            interactive
          />
          <div>
            <p className="font-bold text-white text-lg">
              {MASCOT_ITEMS.find(m => m.key === activeMascot)?.name || activeMascot}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {MASCOT_ITEMS.find(m => m.key === activeMascot)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Mascots grid */}
      <div className="grid grid-cols-2 gap-3">
        {MASCOT_ITEMS.map(mascot => {
          const isOwned = owned.has(mascot.key)
          const isActive = activeMascot === mascot.key
          const canAfford = balance >= mascot.price

          return (
            <div
              key={mascot.key}
              className={cn(
                'bg-[#1a1a2e] rounded-2xl border-2 p-4 transition-all',
                isActive ? 'border-orange-500 shadow-[0_0_15px_rgba(255,107,53,0.15)]' : 'border-white/5',
                isOwned && !isActive && 'border-green-500/30'
              )}
            >
              {/* Mascot image */}
              <div className="flex justify-center mb-2">
                <div className={cn(
                  'relative',
                  !isOwned && 'opacity-50 grayscale'
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/mascots/${mascot.key}_happy.png`}
                    alt={mascot.name}
                    width={72}
                    height={72}
                    className="drop-shadow-md"
                  />
                  {!isOwned && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={24} className="text-gray-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-white text-center text-sm">{mascot.name}</h3>
              <p className="text-[10px] text-gray-500 text-center mt-0.5 line-clamp-2">{mascot.description}</p>

              {/* Rarity badge */}
              <div className="flex justify-center mt-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', RARITY_COLORS[mascot.rarity])}>
                  {mascot.rarity === 'common' ? 'Звичайний' : mascot.rarity === 'rare' ? 'Рідкісний' : mascot.rarity === 'epic' ? 'Епічний' : 'Легендарний'}
                </span>
              </div>

              {/* Action button */}
              <div className="mt-3">
                {isActive ? (
                  <div className="w-full text-center py-2 text-orange-400 text-xs font-bold flex items-center justify-center gap-1">
                    <Check size={14} />
                    Активний
                  </div>
                ) : isOwned ? (
                  <button
                    onClick={() => equipMascot(mascot.key)}
                    className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    Обрати
                  </button>
                ) : (
                  <button
                    onClick={() => buyMascot(mascot)}
                    disabled={!canAfford || buying === mascot.key}
                    className={cn(
                      'w-full font-bold py-2 rounded-xl text-xs transition-colors',
                      canAfford
                        ? 'bg-orange-500 hover:bg-orange-400 text-white'
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    )}
                  >
                    {buying === mascot.key ? '...' : mascot.price === 0 ? 'Безкоштовно' : `💰 ${mascot.price}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
