'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'

interface Props {
  session: any
  recipe: any
  userId: string
  cookCount: number
}

export default function CookingSession({ session, recipe, userId, cookCount }: Props) {
  const router = useRouter()
  const activeMascot = useActiveMascot()
  const supabase = createClient()
  const [elapsed, setElapsed] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepPhotos, setStepPhotos] = useState<Record<number, string>>({})
  const [evaluating, setEvaluating] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeStepForPhoto = useRef<number>(-1)
  const startTime = useRef(new Date(session.started_at).getTime())

  const effectivePoints = cookCount > 0 ? Math.floor(recipe.points / 2) : recipe.points

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const stepIndex = activeStepForPhoto.current
    if (!file || stepIndex === -1) return
    e.target.value = ''

    const step = recipe.instructions[stepIndex]

    if (step.requires_photo) {
      setEvaluating(true)
      try {
        const formData = new FormData()
        formData.append('photo', file)
        formData.append('stepTitle', step.title)
        formData.append('stepDescription', step.description)
        formData.append('recipeName', recipe.name)

        const res = await fetch('/api/cook/evaluate-step', { method: 'POST', body: formData })
        const result = await res.json()

        if (!result.matches) {
          toast.error(`Фото не відповідає етапу. ${result.comment}`)
          return
        }

        toast.success(`${result.comment} +${Math.floor(effectivePoints * 0.1)} бонус XP!`)
        const url = URL.createObjectURL(file)
        setStepPhotos(prev => ({ ...prev, [stepIndex]: url }))
        setCompletedSteps(prev => new Set([...prev, stepIndex]))
      } catch {
        toast.error('Помилка оцінки фото')
      } finally {
        setEvaluating(false)
      }
    } else {
      const url = URL.createObjectURL(file)
      setStepPhotos(prev => ({ ...prev, [stepIndex]: url }))
      setCompletedSteps(prev => new Set([...prev, stepIndex]))
    }
  }

  function triggerPhotoFor(stepIndex: number) {
    activeStepForPhoto.current = stepIndex
    fileInputRef.current?.click()
  }

  async function finishCooking() {
    const lastStep = recipe.instructions.length - 1
    if (!stepPhotos[lastStep] && !completedSteps.has(lastStep)) {
      toast.error('Додай фото готової страви!')
      activeStepForPhoto.current = lastStep
      fileInputRef.current?.click()
      return
    }

    setFinishing(true)
    try {
      const completedBonus = Array.from(completedSteps).filter(
        i => recipe.instructions[i]?.requires_photo
      ).length
      const bonusPoints = Math.floor(effectivePoints * 0.1 * completedBonus)
      const totalPoints = effectivePoints + bonusPoints

      await supabase.from('cooking_sessions').update({
        finished_at: new Date().toISOString(),
        points_earned: totalPoints,
      }).eq('id', session.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, xp, rating_score, level')
        .eq('id', userId)
        .single()

      if (profile) {
        const newXp = (profile.xp || 0) + totalPoints
        const newLevel = getLevel(newXp)
        await supabase.from('profiles').update({
          balance: (profile.balance || 0) + totalPoints,
          xp: newXp,
          rating_score: (profile.rating_score || 0) + totalPoints,
          level: newLevel,
        }).eq('id', userId)
      }

      const { data: saved } = await supabase
        .from('user_saved_recipes')
        .select('id, cook_count')
        .eq('user_id', userId)
        .eq('recipe_id', recipe.id)
        .single()

      if (saved) {
        await supabase.from('user_saved_recipes')
          .update({ cook_count: saved.cook_count + 1 })
          .eq('id', saved.id)
      }

      toast.success(`+${totalPoints} XP!`)
      router.push('/')
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setFinishing(false)
    }
  }

  function getLevel(xp: number): number {
    if (xp >= 4000) return 8
    if (xp >= 2500) return 7
    if (xp >= 1500) return 6
    if (xp >= 1000) return 5
    if (xp >= 600) return 4
    if (xp >= 300) return 3
    if (xp >= 100) return 2
    return 1
  }

  const progress = ((completedSteps.size) / recipe.instructions.length) * 100

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 border border-orange-500/20 rounded-2xl p-5">
        <h1 className="font-extrabold text-lg text-white">{recipe.name}</h1>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Clock size={18} />
            <span className="font-mono text-lg font-bold">{formatTime(elapsed)}</span>
          </div>
          <span className="font-bold text-orange-400 text-sm">+{effectivePoints} XP</span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Прогрес</span>
            <span>{completedSteps.size}/{recipe.instructions.length}</span>
          </div>
          <div className="bg-white/5 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {recipe.instructions.map((step: any, i: number) => {
          const isCompleted = completedSteps.has(i)
          const isLastStep = i === recipe.instructions.length - 1

          return (
            <div
              key={i}
              className={cn(
                'bg-[#1a1a2e] rounded-2xl border p-4 transition-all cursor-pointer',
                isCompleted ? 'border-green-500/20 bg-green-500/5' : 'border-white/5',
                currentStep === i && !isCompleted && 'border-orange-500/30 shadow-[0_0_15px_rgba(255,107,53,0.1)]'
              )}
              onClick={() => setCurrentStep(i)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                  isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                )}>
                  {isCompleted ? <Check size={16} /> : step.step}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{step.title}</p>
                  <p className="text-gray-500 text-xs mt-1">{step.description}</p>

                  {stepPhotos[i] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stepPhotos[i]} alt="" className="w-full rounded-lg mt-2 max-h-40 object-cover" />
                  )}

                  {!isCompleted && (
                    <div className="mt-3 flex gap-2">
                      {(step.requires_photo || isLastStep) ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerPhotoFor(i) }}
                          disabled={evaluating}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors',
                            isLastStep
                              ? 'bg-green-500 hover:bg-green-400 text-white'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                          )}
                        >
                          <Camera size={14} />
                          {evaluating ? 'Оцінюємо...' : isLastStep ? 'Фото страви' : 'Фото (+бонус)'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCompletedSteps(prev => new Set([...prev, i]))
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl text-xs font-bold transition-colors"
                        >
                          <Check size={14} />
                          Готово
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mascot encouragement */}
      {progress >= 100 && (
        <Mascot name={activeMascot as any} mood="happy" size={80} message="Чудова робота!" animation="celebrate" />
      )}

      <button
        onClick={finishCooking}
        disabled={finishing}
        className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
      >
        {finishing ? 'Зберігаємо...' : 'Страву готово!'}
      </button>
    </div>
  )
}
