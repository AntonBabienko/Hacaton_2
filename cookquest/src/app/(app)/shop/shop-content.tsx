'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShoppingBag, Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RARITY_COLORS, MASCOT_ITEMS, DEFAULT_MASCOT } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'
import { useActiveMascot, useSetActiveMascot, useBalance, useSetBalance } from '@/components/mascot-provider'

interface Props {
  userId: string
  activeSkinId: string | null
  activeMascot: string
  skins: any[]
  ownedSkinIds: string[]
}

export default function ShopContent({
  userId,
  activeSkinId: initialActiveSkinId,
  activeMascot: initialActiveMascot,
  skins,
  ownedSkinIds,
}: Props) {
  const balance = useBalance()
  const setBalance = useSetBalance()
  const [owned, setOwned] = useState<Set<string>>(new Set(ownedSkinIds))
  const [activeSkinId, setActiveSkinId] = useState(initialActiveSkinId)
  const activeMascot = useActiveMascot()
  const [buying, setBuying] = useState<string | null>(null)
  const supabase = createClient()
  const setGlobalMascot = useSetActiveMascot()

  // emoji field in skins table stores the mascot file key (e.g. 'broccoli')
  function getMascotKey(skin: any): string {
    if (skin.emoji && MASCOT_ITEMS.find(m => m.key === skin.emoji)) return skin.emoji
    // fallback: match by Ukrainian display name
    const byName = MASCOT_ITEMS.find(m => m.name === skin.name)
    if (byName) return byName.key
    return DEFAULT_MASCOT
  }

  async function buySkin(skin: any) {
    if (balance < skin.price) { toast.error('Недостатньо балів!'); return }
    // Local items (no DB) — just mark as owned locally
    if (skin._local) {
      setOwned(prev => new Set([...prev, skin.id]))
      await supabase.from('profiles').update({ balance: balance - skin.price }).eq('id', userId)
      setBalance(b => b - skin.price)
      toast.success(`${skin.name} тепер твій! Запустіть SQL міграцію щоб зберегти постійно.`)
      return
    }
    setBuying(skin.id)
    try {
      const { error } = await supabase.from('user_skins').insert({ user_id: userId, skin_id: skin.id })
      if (error) { toast.error('Помилка покупки'); return }
      await supabase.from('profiles').update({ balance: balance - skin.price }).eq('id', userId)
      setBalance(b => b - skin.price)
      setOwned(prev => new Set([...prev, skin.id]))
      toast.success(`${skin.name} тепер твій!`)
    } finally {
      setBuying(null)
    }
  }

  async function equipSkin(skin: any) {
    const mascotKey = getMascotKey(skin)
    // For local items (no real UUID), only update local state
    if (skin._local) {
      setActiveSkinId(skin.id)
      setGlobalMascot(mascotKey)
      toast.success('Маскот встановлено! (локально — запустіть SQL міграцію)')
      return
    }
    const { error } = await supabase.from('profiles').update({ current_skin_id: skin.id }).eq('id', userId)
    if (error) { toast.error('Помилка'); return }
    setActiveSkinId(skin.id)
    setGlobalMascot(mascotKey)
    toast.success('Маскот встановлено!')
  }

  // If no skins in DB — show mascots from constants directly
  const items = skins.length > 0 ? skins : MASCOT_ITEMS.map((m, i) => ({
    id: m.key,
    name: m.name,
    emoji: m.key,
    description: m.description,
    price: m.price,
    rarity: m.rarity,
    _local: true,
  }))

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
          <Mascot name={activeMascot as any} mood="happy" size={72} animation="bounce" interactive />
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
        {items.map((skin: any) => {
          const mascotKey = getMascotKey(skin)
          const isOwned = skin.price === 0 || owned.has(skin.id)
          const isActive = activeSkinId === skin.id || (skin._local && activeMascot === mascotKey)
          const canAfford = balance >= skin.price

          return (
            <div
              key={skin.id}
              className={cn(
                'bg-[#1a1a2e] rounded-2xl border-2 p-4 transition-all',
                isActive ? 'border-orange-500 shadow-[0_0_15px_rgba(255,107,53,0.15)]' : 'border-white/5',
                isOwned && !isActive && 'border-green-500/30'
              )}
            >
              {/* Mascot image */}
              <div className="flex justify-center mb-2">
                <div className={cn('relative', !isOwned && 'opacity-50 grayscale')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/mascots/${mascotKey}_happy.png`} alt={skin.name} width={72} height={72} className="drop-shadow-md" />
                  {!isOwned && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={24} className="text-gray-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-white text-center text-sm">{skin.name}</h3>
              <p className="text-[10px] text-gray-500 text-center mt-0.5 line-clamp-2">{skin.description}</p>

              <div className="flex justify-center mt-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', RARITY_COLORS[skin.rarity as keyof typeof RARITY_COLORS])}>
                  {skin.rarity === 'common' ? 'Звичайний' : skin.rarity === 'rare' ? 'Рідкісний' : skin.rarity === 'epic' ? 'Епічний' : 'Легендарний'}
                </span>
              </div>

              <div className="mt-3">
                {isActive ? (
                  <div className="w-full text-center py-2 text-orange-400 text-xs font-bold flex items-center justify-center gap-1">
                    <Check size={14} /> Активний
                  </div>
                ) : isOwned ? (
                  <button
                    onClick={() => equipSkin(skin)}
                    className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    Обрати
                  </button>
                ) : (
                  <button
                    onClick={() => buySkin(skin)}
                    disabled={!canAfford || buying === skin.id}
                    className={cn(
                      'w-full font-bold py-2 rounded-xl text-xs transition-colors',
                      canAfford ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    )}
                  >
                    {buying === skin.id ? '...' : skin.price === 0 ? 'Безкоштовно' : `💰 ${skin.price}`}
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
