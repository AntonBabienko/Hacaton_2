'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n/client'

interface Props {
  recipe: any
  userId: string
  savedRecipe: any
  friends: any[]
}

export default function RecipeDetail({ recipe, userId, savedRecipe, friends }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(!!savedRecipe)
  const [showBattleModal, setShowBattleModal] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState('')

  const effectivePoints = savedRecipe && savedRecipe.cook_count > 0
    ? Math.floor(recipe.points / 2)
    : recipe.points

  async function handleSave() {
    if (isSaved) return
    const { error } = await supabase.from('user_saved_recipes').insert({
      user_id: userId,
      recipe_id: recipe.id,
      cook_count: 0,
    })
    if (!error) {
      setIsSaved(true)
      toast.success(t.recipe.saved)
    }
  }

  async function handleCookAlone() {
    const { data, error } = await supabase.from('cooking_sessions').insert({
      user_id: userId,
      recipe_id: recipe.id,
      started_at: new Date().toISOString(),
      steps_photos: {},
    }).select().single()

    if (error || !data) {
      toast.error(t.recipe.error)
      return
    }
    router.push(`/cook/${data.id}`)
  }

  async function handleBattleInvite() {
    if (!selectedFriend) {
      toast.error(t.recipe.choose_friend)
      return
    }

    const { data, error } = await supabase.from('battles').insert({
      recipe_id: recipe.id,
      challenger_id: userId,
      opponent_id: selectedFriend,
      status: 'pending',
    }).select().single()

    if (error || !data) {
      toast.error(t.recipe.battle_error)
      return
    }

    await supabase.from('notifications').insert({
      user_id: selectedFriend,
      type: 'battle_invite',
      data: {
        battle_id: data.id,
        recipe_name: recipe.name,
        challenger_id: userId,
      },
      read: false,
    })

    toast.success(t.recipe.invite_sent)
    setShowBattleModal(false)
    router.push(`/battle/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-extrabold text-white">{recipe.name}</h1>
          <button onClick={handleSave} className="text-orange-400 hover:text-orange-300 transition-colors ml-2">
            {isSaved ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4">{recipe.description}</p>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-bold', DIFFICULTY_COLORS[recipe.difficulty as keyof typeof DIFFICULTY_COLORS])}>
            {DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS]}
          </span>
          <span className="text-orange-400 font-bold text-sm">+{effectivePoints} XP</span>
          {savedRecipe && savedRecipe.cook_count > 0 && (
            <span className="text-[10px] text-gray-600">{t.recipe.repeated}</span>
          )}
          <span className="text-gray-500 text-xs">{recipe.cuisine_type}</span>
        </div>

        <button
          onClick={() => setIngredientsOpen(v => !v)}
          className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 mt-4"
        >
          {ingredientsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {t.recipe.ingredients} ({recipe.ingredients.length})
        </button>
        {ingredientsOpen && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.ingredients.map((ing: any, i: number) => (
              <span key={i} className="bg-orange-500/10 text-orange-300 text-xs px-2 py-1 rounded-lg">
                {typeof ing === 'string' ? ing : `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
        <h2 className="font-bold text-white mb-3">{t.recipe.instructions}</h2>
        <div className="space-y-3">
          {recipe.instructions.map((step: any, i: number) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0 mt-0.5">
                {step.step}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{step.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>
                {step.requires_photo && (
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded mt-1 inline-block font-bold">
                    {t.recipe.need_photo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCookAlone}
          className="bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-colors text-sm"
        >
          {t.recipe.cook}
        </button>
        <button
          onClick={() => setShowBattleModal(true)}
          disabled={!friends.length}
          className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Swords size={16} />
          {t.recipe.battle}
        </button>
      </div>
      {!friends.length && (
        <p className="text-[10px] text-gray-600 text-center">{t.recipe.add_friends}</p>
      )}

      {/* Battle modal */}
      {showBattleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-sm">
            <h3 className="font-extrabold text-white text-lg mb-4">{t.recipe.challenge_title}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {recipe.name} • <span className="text-orange-400 font-bold">{Math.round(recipe.points * 2.6)} XP</span> {t.recipe.in_pool}
            </p>
            <select
              value={selectedFriend}
              onChange={e => setSelectedFriend(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="" className="bg-[#1a1a2e]">{t.recipe.choose_friend}</option>
              {friends.map((f: any) => (
                <option key={f.id} value={f.friend?.id} className="bg-[#1a1a2e]">
                  {f.friend?.username}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowBattleModal(false)}
                className="py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 text-sm"
              >
                {t.recipe.cancel}
              </button>
              <button
                onClick={handleBattleInvite}
                className="py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold text-sm"
              >
                {t.recipe.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
