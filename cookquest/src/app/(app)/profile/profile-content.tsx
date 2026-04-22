'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, BookOpen, Zap, Settings, X, Plus } from 'lucide-react'
import { getLevelInfo, getXpProgress } from '@/lib/utils'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, MASCOT_ITEMS, DIET_OPTIONS, ALLERGEN_OPTIONS, type DietaryPreferences } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Mascot from '@/components/mascot'
import { useTranslation } from '@/lib/i18n/client'
import { setLocale } from '@/app/actions/locale'
import { useRouter } from 'next/navigation'

interface Props {
  profile: any
  savedRecipes: any[]
}

export default function ProfileContent({ profile, savedRecipes }: Props) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [activeMascot, setActiveMascot] = useState(profile?.active_skin_emoji || 'broccoli')
  const supabase = createClient()

  // Dietary preferences state
  const prefs: DietaryPreferences = profile?.dietary_preferences || { diet: 'none', allergens: [], dislikes: [], custom_note: '' }
  const [diet, setDiet] = useState(prefs.diet || 'none')
  const [allergens, setAllergens] = useState<string[]>(prefs.allergens || [])
  const [dislikes, setDislikes] = useState<string[]>(prefs.dislikes || [])
  const [customNote, setCustomNote] = useState(prefs.custom_note || '')
  const [dislikeInput, setDislikeInput] = useState('')
  const [saving, setSaving] = useState(false)

  const levelInfo = getLevelInfo(profile?.xp || 0)
  const xpProgress = getXpProgress(profile?.xp || 0)
  const mascotInfo = MASCOT_ITEMS.find(m => m.key === activeMascot)

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (xpProgress / 100) * circumference

  async function savePreferences() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          dietary_preferences: {
            diet,
            allergens,
            dislikes,
            custom_note: customNote.trim(),
          },
        })
        .eq('id', profile.id)
      if (error) { toast.error(t.profile.save_error); return }
      toast.success(t.profile.settings_saved)
    } finally {
      setSaving(false)
    }
  }

  async function handleLanguageChange(newLocale: 'en' | 'uk') {
    await setLocale(newLocale)
    // Optional: update locale in DB
    await supabase.from('profiles').update({ locale: newLocale }).eq('id', profile.id)
    router.refresh()
  }

  function toggleAllergen(key: string) {
    setAllergens(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key])
  }

  function addDislike() {
    const val = dislikeInput.trim()
    if (!val || dislikes.includes(val)) return
    setDislikes(prev => [...prev, val])
    setDislikeInput('')
  }

  function removeDislike(item: string) {
    setDislikes(prev => prev.filter(d => d !== item))
  }

  async function exportRecipePDF(recipe: any) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    // Load and register custom font for Cyrillic support
    const response = await fetch('/fonts/Roboto-Regular.ttf')
    const blob = await response.blob()
    const base64Font = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1])
      reader.readAsDataURL(blob)
    })

    doc.addFileToVFS('Roboto-Regular.ttf', base64Font)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.setFont('Roboto')

    const pageH = doc.internal.pageSize.getHeight()

    function checkPage(y: number, needed = 10): number {
      if (y + needed > pageH - 15) {
        doc.addPage()
        doc.setFont('Roboto')
        return 20
      }
      return y
    }

    doc.setFontSize(20)
    doc.text(recipe.name, 20, 20, { maxWidth: 170 })

    doc.setFontSize(12)
    doc.text(`Складність: ${DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS]}`, 20, 35)
    doc.text(`Кухня: ${recipe.cuisine_type}`, 20, 45)
    doc.text(recipe.description || '', 20, 55, { maxWidth: 170 })

    let y = 85 // Shifted down a bit to accommodate possible long descriptions
    doc.setFontSize(14)
    doc.text('Інгредієнти:', 20, y)
    doc.setFontSize(11)
    y += 10
    recipe.ingredients.forEach((ing: any) => {
      const label = typeof ing === 'string' ? ing : `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`
      const lines = doc.splitTextToSize(`• ${label}`, 165)
      lines.forEach((line: string) => {
        y = checkPage(y, 7)
        doc.text(line, 25, y)
        y += 7
      })
    })

    y = checkPage(y + 5, 20)
    doc.setFontSize(14)
    doc.text('Приготування:', 20, y)
    doc.setFontSize(11)
    y += 10
    recipe.instructions.forEach((step: any) => {
      y = checkPage(y, 18)
      doc.text(`${step.step}. ${step.title}`, 20, y, { maxWidth: 170 })
      y += 8
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(step.description, 165)
      lines.forEach((line: string) => {
        y = checkPage(y, 5)
        doc.text(line, 25, y)
        y += 5
      })
      doc.setFontSize(11)
      y += 5
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
            <p className="text-xs text-gray-400">{levelInfo.name} • {t.profile.level} {profile?.level}</p>
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
            <div className="text-[10px] text-gray-500">{t.profile.balance}</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-purple-400">🏆 {profile?.rating_score}</div>
            <div className="text-[10px] text-gray-500">{t.profile.rating}</div>
          </div>
        </div>
      </div>

      {/* Saved recipes */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-orange-400" />
          {t.profile.saved_recipes} ({savedRecipes.length})
        </h2>
        {savedRecipes.length === 0 ? (
          <div className="py-4">
            <Mascot name={activeMascot as any} mood="neutral" size={100} message={t.profile.no_recipes} animation="bounce" />
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
          {t.profile.my_mascot}
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
              {t.profile.change_in_shop}
            </Link>
          </div>
        </div>
      </div>

      {/* Language / App Settings */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Settings size={18} className="text-blue-400" />
          {t.profile.language_select}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleLanguageChange('uk')}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-bold transition-all border',
              locale === 'uk' 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
            )}
          >
            Українська
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-bold transition-all border',
              locale === 'en' 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
            )}
          >
            English
          </button>
        </div>
      </div>

      {/* Dietary preferences */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Settings size={18} className="text-green-400" />
          {t.profile.culinary_prefs}
        </h2>

        {/* Diet type */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.profile.diet_type}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {DIET_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDiet(opt.key)}
                className={cn(
                  'px-2 py-2 rounded-xl text-xs font-bold transition-all text-center',
                  diet === opt.key
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
                )}
              >
                <span className="block text-base mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allergens */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.profile.allergens}</p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGEN_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggleAllergen(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                  allergens.includes(opt.key)
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
                )}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dislikes */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.profile.dislikes}</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={dislikeInput}
              onChange={e => setDislikeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDislike()}
              placeholder={t.profile.dislike_placeholder}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <button
              onClick={addDislike}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {dislikes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dislikes.map(item => (
                <span
                  key={item}
                  className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-bold"
                >
                  {item}
                  <button onClick={() => removeDislike(item)} className="hover:text-orange-300">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Custom note */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.profile.custom_notes}</p>
          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder={t.profile.custom_notes_placeholder}
            rows={2}
            maxLength={200}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={savePreferences}
          disabled={saving}
          className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? t.common.saving : t.profile.save_prefs}
        </button>
      </div>
    </div>
  )
}
