'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, ChevronDown, ChevronUp, Swords, Camera } from 'lucide-react'
import { formatTime, compressImage } from '@/lib/utils'
import { BATTLE_MULTIPLIER, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'

interface Props {
  battle: any
  userId: string
  isChallenger: boolean
}

export default function BattlePage({ battle, userId, isChallenger }: Props) {
  const router = useRouter()
  const activeMascot = useActiveMascot()
  const supabase = createClient()
  const [currentBattle, setCurrentBattle] = useState(battle)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isCooking, setIsCooking] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [recipeVisible, setRecipeVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<number>(0)

  const myStartedAt = isChallenger ? currentBattle.challenger_started_at : currentBattle.opponent_started_at
  const myFinishedAt = isChallenger ? currentBattle.challenger_finished_at : currentBattle.opponent_finished_at
  const opponent = isChallenger ? currentBattle.opponent : currentBattle.challenger

  useEffect(() => {
    if (myStartedAt && !myFinishedAt) {
      startTimeRef.current = new Date(myStartedAt).getTime()
      setIsCooking(true)
      setRecipeVisible(true)
    }
  }, [myStartedAt, myFinishedAt])

  useEffect(() => {
    if (!isCooking || myFinishedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isCooking, myFinishedAt])

  useEffect(() => {
    const channel = supabase
      .channel(`battle:${battle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${battle.id}`,
      }, payload => {
        setCurrentBattle((prev: any) => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [battle.id, supabase])

  async function acceptBattle() {
    const now = new Date().toISOString()
    const update: any = { status: 'in_progress' }
    if (isChallenger) update.challenger_started_at = now
    else update.opponent_started_at = now

    const { error } = await supabase.from('battles').update(update).eq('id', battle.id)
    if (error) { toast.error('Помилка'); return }

    startTimeRef.current = Date.now()
    setIsCooking(true)
    setRecipeVisible(true)
    toast.success('Таймер пішов!')
  }

  async function submitResult(file: File) {
    setFinishing(true)
    try {
      const compressedBlob = await compressImage(file)
      const compressedFile = new File([compressedBlob], 'photo.jpg', { type: 'image/jpeg' })

      const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const formData = new FormData()
      formData.append('photo', compressedFile)
      formData.append('recipeName', currentBattle.recipe.name)
      formData.append('recipePoints', currentBattle.recipe.points.toString())
      formData.append('timeSeconds', timeSeconds.toString())

      const res = await fetch('/api/battle/evaluate', { method: 'POST', body: formData })
      const result = await res.json()

      const now = new Date().toISOString()
      const update: any = {}
      if (isChallenger) {
        update.challenger_finished_at = now
        update.challenger_time = timeSeconds
        update.challenger_quality = result.quality
      } else {
        update.opponent_finished_at = now
        update.opponent_time = timeSeconds
        update.opponent_quality = result.quality
      }

      await supabase.from('battles').update(update).eq('id', battle.id)

      // Try to complete battle if both finished using safe Postgres RPC
      const { data: resultRpc } = await supabase.rpc('complete_battle', { p_battle_id: battle.id })

      if (resultRpc && resultRpc.status === 'success') {
        // Manually trigger local state update so UI shows results immediately
        setCurrentBattle((prev: any) => ({
          ...prev,
          status: 'completed',
          challenger_score: resultRpc.c_points,
          opponent_score: resultRpc.o_points
        }))
      }

      toast.success(`Якість: ${result.quality}/100`)
      // No router.push here - stay on page to see result via subscription or results screen
    } catch (err) {
      console.error(err)
      toast.error('Помилка відправки')
    } finally {
      setFinishing(false)
    }
  }



  const totalPool = Math.round(currentBattle.recipe.points * BATTLE_MULTIPLIER)

  // Completed
  if (currentBattle.status === 'completed') {
    const myPts = isChallenger ? currentBattle.challenger_score : currentBattle.opponent_score
    const oppPts = isChallenger ? currentBattle.opponent_score : currentBattle.challenger_score
    const won = myPts >= oppPts

    return (
      <div className="max-w-lg mx-auto text-center space-y-5">
        <div className={cn(
          'rounded-2xl p-8 border',
          won
            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/20'
            : 'bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-white/5'
        )}>
          <Mascot
            name={activeMascot as any}
            mood={won ? 'happy' : 'sad'}
            size={120}
            animation={won ? 'celebrate' : 'shake'}
          />
          <h1 className="text-2xl font-extrabold text-white mt-2">{won ? 'Перемога!' : 'Наступного разу!'}</h1>
          <p className="text-gray-400 mt-1">{currentBattle.recipe.name}</p>
          <div className="mt-4 text-3xl font-extrabold text-orange-400">+{myPts} XP</div>
          <p className="text-gray-500 text-sm mt-1">{opponent?.username}: +{oppPts} XP</p>
        </div>
        <button onClick={() => router.push('/')} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl">
          На головну
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) submitResult(file)
          e.target.value = ''
        }}
      />

      {/* Header */}
      <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Swords size={20} className="text-red-400" />
          <span className="font-extrabold text-white text-lg">Батл</span>
        </div>
        <h2 className="text-lg font-bold text-white">{currentBattle.recipe.name}</h2>
        <p className="text-gray-400 text-sm mt-1">{currentBattle.recipe.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', DIFFICULTY_COLORS[currentBattle.recipe.difficulty as keyof typeof DIFFICULTY_COLORS])}>
            {DIFFICULTY_LABELS[currentBattle.recipe.difficulty as keyof typeof DIFFICULTY_LABELS]}
          </span>
          <span className="font-bold text-orange-400 text-sm">Пул: {totalPool} XP</span>
        </div>
      </div>

      {/* Opponents */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-xl mx-auto">
              {isChallenger ? '👤' : opponent?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-sm font-bold text-white mt-1.5">
              {isChallenger ? 'Ви' : opponent?.username}
            </p>
            {myFinishedAt && <p className="text-[10px] text-green-400 font-bold">✓ Готово</p>}
          </div>
          <div className="text-2xl">⚔️</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-xl mx-auto">
              {!isChallenger ? '👤' : opponent?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-sm font-bold text-white mt-1.5">
              {!isChallenger ? 'Ви' : opponent?.username}
            </p>
            {(isChallenger ? currentBattle.opponent_finished_at : currentBattle.challenger_finished_at) && (
              <p className="text-[10px] text-green-400 font-bold">✓ Готово</p>
            )}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
        <button
          onClick={() => setIngredientsOpen(v => !v)}
          className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
        >
          {ingredientsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Інгредієнти ({currentBattle.recipe.ingredients.length})
        </button>
        {ingredientsOpen && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {currentBattle.recipe.ingredients.map((ing: any, i: number) => (
              <span key={i} className="bg-orange-500/10 text-orange-300 text-xs px-2 py-1 rounded-lg">
                {typeof ing === 'string' ? ing : `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recipe steps */}
      {recipeVisible && (
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
          <h3 className="font-bold text-white mb-3">Рецепт</h3>
          <div className="space-y-3">
            {currentBattle.recipe.instructions.map((step: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0">
                  {step.step}
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timer */}
      {isCooking && !myFinishedAt && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <Clock size={20} />
            <span className="font-mono text-2xl font-extrabold">{formatTime(elapsed)}</span>
          </div>
          <span className="text-xs text-orange-400/60">Таймер іде...</span>
        </div>
      )}

      {/* Actions */}
      {!isCooking && !myFinishedAt && (
        <button
          onClick={acceptBattle}
          className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-lg transition-colors animate-pulse-glow"
          style={{ '--accent-glow': 'rgba(239,68,68,0.3)' } as React.CSSProperties}
        >
          ⚔️ Почати приготування
        </button>
      )}

      {isCooking && !myFinishedAt && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={finishing}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          <Camera size={20} />
          {finishing ? 'Надсилаємо...' : 'Страву готово — фото'}
        </button>
      )}

      {myFinishedAt && currentBattle.status !== 'completed' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 font-bold text-sm">Результат надіслано ✓</p>
          <p className="text-green-500/60 text-xs mt-1">Очікуємо суперника...</p>
        </div>
      )}
    </div>
  )
}
