'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, BookOpen, Zap } from 'lucide-react'
import { getLevelInfo, getXpProgress } from '@/lib/utils'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, MASCOT_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Mascot from '@/components/mascot'

interface Props {
  profile: any
  savedRecipes: any[]
}

export default function ProfileContent({ profile, savedRecipes }: Props) {
  // activeMascot comes from props — profile.active_skin_emoji is resolved server-side
  const [activeMascot, setActiveMascot] = useState(profile?.active_skin_emoji || 'broccoli')
  const supabase = createClient()

  const levelInfo = getLevelInfo(profile?.xp || 0)
  const xpProgress = getXpProgress(profile?.xp || 0)
  const mascotInfo = MASCOT_ITEMS.find(m => m.key === activeMascot)

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (xpProgress / 100) * circumference

  // Mascot changes happen in the Shop — this is display only

  async function exportRecipePDF(recipe: any) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageH = doc.internal.pageSize.getHeight()

    function checkPage(y: number, needed = 10): number {
      if (y + needed > pageH - 15) {
        doc.addPage()
        return 20
      }
      return y
    }

    doc.setFontSize(20)
    doc.text(recipe.name, 20, 20)

    doc.setFontSize(12)
    doc.text(`Складність: ${DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS]}`, 20, 35)
    doc.text(`Кухня: ${recipe.cuisine_type}`, 20, 45)
    doc.text(recipe.description, 20, 55, { maxWidth: 170 })

    let y = 75
    doc.setFontSize(14)
    doc.text('Інгредієнти:', 20, y)
    doc.setFontSize(11)
    y += 10
    recipe.ingredients.forEach((ing: string) => {
      y = checkPage(y, 7)
      doc.text(`• ${ing}`, 25, y)
      y += 7
    })

    y = checkPage(y + 5, 20)
    doc.setFontSize(14)
    doc.text('Приготування:', 20, y)
    doc.setFontSize(11)
    y += 10
    recipe.instructions.forEach((step: any) => {
      y = checkPage(y, 18)
      doc.text(`${step.step}. ${step.title}`, 20, y)
      y += 6
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(step.description, 165)
      lines.forEach((line: string) => {
        y = checkPage(y, 5)
        doc.text(line, 25, y)
        y += 5
      })
      doc.setFontSize(11)
      y += 3
    })

    doc.save(`${recipe.name}.pdf`)
    toast.success('PDF збережено!')
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Profile header */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <div className="flex items-center gap-4">
          {/* XP Ring */}
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" className="rotate-[-90deg]">
              <circle cx="40" cy="40" r={35} fill="none" stroke="#2a2a4a" strokeWidth="5" />
              <circle
                cx="40" cy="40" r={35} fill="none"
                stroke="#58cc02" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 35}
                strokeDashoffset={2 * Math.PI * 35 - (xpProgress / 100) * 2 * Math.PI * 35}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/mascots/${activeMascot}_happy.png`}
                alt=""
                width={48}
                height={48}
                className="drop-shadow-md"
              />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-white">{profile?.username}</h1>
            <p className="text-xs text-gray-400">{levelInfo.name} • Рівень {profile?.level}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Zap size={12} className="text-green-400" />
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-green-400 font-bold">
                {profile?.xp} / {levelInfo.max_xp === Infinity ? 'MAX' : levelInfo.max_xp}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-yellow-400">💰 {profile?.balance}</div>
            <div className="text-[10px] text-gray-500">Баланс</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-purple-400">🏆 {profile?.rating_score}</div>
            <div className="text-[10px] text-gray-500">Рейтинг</div>
          </div>
        </div>
      </div>

      {/* Saved recipes */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-orange-400" />
          Збережені рецепти ({savedRecipes.length})
        </h2>
        {savedRecipes.length === 0 ? (
          <div className="py-4">
            <Mascot name={activeMascot as any} mood="neutral" size={100} message="Ще немає рецептів. Час готувати!" animation="bounce" />
          </div>
        ) : (
          <div className="space-y-2">
            {savedRecipes.map((sr: any) => (
              <div key={sr.id} className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{sr.recipe.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', DIFFICULTY_COLORS[sr.recipe.difficulty as keyof typeof DIFFICULTY_COLORS])}>
                        {DIFFICULTY_LABELS[sr.recipe.difficulty as keyof typeof DIFFICULTY_LABELS]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sr.cook_count > 0
                          ? `+${Math.floor(sr.recipe.points / 2)} XP`
                          : `+${sr.recipe.points} XP`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportRecipePDF(sr.recipe)}
                      className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                      title="Завантажити PDF"
                    >
                      <Download size={14} />
                    </button>
                    <Link
                      href={`/recipe/${sr.recipe_id}`}
                      className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors text-sm"
                    >
                      →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active mascot */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-3 flex items-center gap-2">
          Мій маскот
        </h2>
        <div className="flex items-center gap-4">
          <Mascot
            name={activeMascot as any}
            mood="happy"
            size={64}
            animation="idle"
            interactive
          />
          <div>
            <p className="font-bold text-white">{mascotInfo?.name || activeMascot}</p>
            <p className="text-xs text-gray-500 mt-0.5">{mascotInfo?.description}</p>
            <Link
              href="/shop"
              className="inline-block mt-2 text-xs text-orange-400 hover:text-orange-300 font-bold"
            >
              Змінити в магазині →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
