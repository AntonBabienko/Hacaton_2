'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Shuffle, X, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GeneratedRecipe } from '@/types'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'

function GenerateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'random' ? 'random' : 'photo'

  const [mode, setMode] = useState<'photo' | 'random'>(initialMode)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'ingredients' | 'recipes'>('input')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([])
  const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(new Set())
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function addPhoto(file: File) {
    if (photos.length >= 3) {
      toast.error('Максимум 3 фото')
      return
    }
    setPhotos(prev => [...prev, file])
    const url = URL.createObjectURL(file)
    setPhotoPreviews(prev => [...prev, url])
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function analyzePhotos() {
    if (!photos.length) {
      toast.error('Додай хоча б одне фото')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      photos.forEach(p => formData.append('photos', p))

      const res = await fetch('/api/analyze-photo', { method: 'POST', body: formData })
      const data = await res.json()

      if (!data.ingredients?.length) {
        toast.error('Не вдалося розпізнати продукти')
        return
      }
      setIngredients(data.ingredients)
      setStep('ingredients')
    } catch {
      toast.error('Помилка аналізу фото')
    } finally {
      setLoading(false)
    }
  }

  function toggleExclude(ingredient: string) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(ingredient)) next.delete(ingredient)
      else next.add(ingredient)
      return next
    })
  }

  async function generateFromIngredients() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, excludedIngredients: Array.from(excluded) }),
      })
      const data = await res.json()
      if (!data.recipes?.length) {
        toast.error('Не вдалося згенерувати рецепти')
        return
      }
      setRecipes(data.recipes)
      setStep('recipes')
    } catch {
      toast.error('Помилка генерації рецептів')
    } finally {
      setLoading(false)
    }
  }

  async function generateRandom() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-random-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!data.recipes?.length) {
        toast.error('Не вдалося згенерувати рецепти')
        return
      }
      setRecipes(data.recipes)
      setStep('recipes')
    } catch {
      toast.error('Помилка генерації рецептів')
    } finally {
      setLoading(false)
    }
  }

  async function selectRecipe(recipe: GeneratedRecipe) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        name: recipe.name,
        description: recipe.description,
        difficulty: recipe.difficulty,
        points: recipe.points,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        cuisine_type: recipe.cuisine_type,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Помилка збереження рецепта')
      return
    }

    router.push(`/recipe/${data.id}`)
  }

  function toggleRecipeIngredients(index: number) {
    setExpandedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // STEP: RECIPES
  if (step === 'recipes') {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <Mascot name="cauldron" mood="happy" size={80} message="Обери рецепт!" animation="pop" />
        </div>
        <div className="space-y-3">
          {recipes.map((recipe, i) => (
            <div key={i} className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5 hover:border-orange-500/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white text-lg">{recipe.name}</h3>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-bold', DIFFICULTY_COLORS[recipe.difficulty])}>
                    {DIFFICULTY_LABELS[recipe.difficulty]}
                  </span>
                  <span className="text-orange-400 font-bold text-sm">+{recipe.points} XP</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-3">{recipe.description}</p>

              <button
                onClick={() => toggleRecipeIngredients(i)}
                className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 mb-3"
              >
                {expandedIngredients.has(i) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Інгредієнти ({recipe.ingredients.length})
              </button>
              {expandedIngredients.has(i) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {recipe.ingredients.map((ing, j) => (
                    <span key={j} className="bg-white/5 text-gray-300 text-xs px-2 py-1 rounded-lg">
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => selectRecipe(recipe)}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 rounded-xl transition-colors"
              >
                Обрати цей рецепт
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // STEP: INGREDIENTS
  if (step === 'ingredients') {
    return (
      <div className="space-y-5">
        <div className="flex justify-center">
          <Mascot name="cheese" mood="happy" size={80} message="Ось що я знайшов!" animation="pop" />
        </div>
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Натисни на продукт щоб <span className="text-red-400 font-bold">виключити</span> його
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ingredients.map(ing => (
            <button
              key={ing}
              onClick={() => toggleExclude(ing)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-bold transition-all border',
                excluded.has(ing)
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-orange-500/30'
              )}
            >
              {ing}
            </button>
          ))}
        </div>
        {excluded.size > 0 && (
          <p className="text-sm text-red-400">
            Виключено: {excluded.size} продуктів
          </p>
        )}
        <button
          onClick={generateFromIngredients}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Генеруємо рецепти...' : 'Знайти рецепти'}
        </button>
      </div>
    )
  }

  // STEP: INPUT
  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <Mascot name="pepper" mood="happy" size={90} message="Що приготуємо?" animation="pop" />
      </div>

      {/* Mode tabs */}
      <div className="flex bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setMode('photo')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
            mode === 'photo' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500'
          )}
        >
          <Camera size={16} />
          Фото
        </button>
        <button
          onClick={() => setMode('random')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
            mode === 'random' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500'
          )}
        >
          <Shuffle size={16} />
          Генератор
        </button>
      </div>

      {mode === 'photo' ? (
        <div className="space-y-4">
          {/* Camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) addPhoto(file)
              e.target.value = ''
            }}
          />
          {/* Gallery input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) addPhoto(file)
              e.target.value = ''
            }}
          />
          <div className="grid grid-cols-3 gap-3">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-bold transition-colors"
                >
                  <Camera size={14} />
                  Камера
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs font-bold transition-colors"
                >
                  <Upload size={14} />
                  Галерея
                </button>
                <span className="text-[10px] text-gray-600">{photos.length}/3</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-600">
            До 3 фото: холодильник, шафа, чек з магазину
          </p>
          <button
            onClick={analyzePhotos}
            disabled={loading || !photos.length}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Аналізуємо...' : 'Визначити продукти'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
            placeholder="Опишіть побажання: бюджетне з курки, без цибулі, щось азіатське..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent resize-none text-sm"
          />
          <p className="text-xs text-gray-600">Чим конкретніше — тим краще</p>
          <button
            onClick={generateRandom}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Генеруємо...' : 'Знайти рецепти'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <div className="max-w-lg mx-auto">
      <Suspense fallback={<div className="text-center py-8 text-gray-600">Завантаження...</div>}>
        <GenerateContent />
      </Suspense>
    </div>
  )
}
