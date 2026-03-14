'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Wand2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSetActiveMascot } from '@/components/mascot-provider'

// ─── Catalog data ─────────────────────────────────────────────────────────────

const TYPES = [
  { id: 'chef',      icon: '👨‍🍳', label: 'Шеф',      subjectLabel: null,        placeholder: null },
  { id: 'ingredient',icon: '🍅', label: 'Інгред.',  subjectLabel: 'Інгредієнт',placeholder: 'морква, гриби, сир...' },
  { id: 'dish',      icon: '🍲', label: 'Страва',   subjectLabel: 'Страва',    placeholder: 'борщ, піца, торт...' },
  { id: 'appliance', icon: '🍳', label: 'Прилад',   subjectLabel: 'Предмет',   placeholder: 'сковорода, чайник...' },
  { id: 'animal',    icon: '🐻', label: 'Тварина',  subjectLabel: 'Тварина',   placeholder: 'ведмідь, кіт, лисиця...' },
  { id: 'trophy',    icon: '🏆', label: 'Трофей',   subjectLabel: null,        placeholder: null },
]

const STYLES = [
  { id: 'cartoon', label: 'Мульт' },
  { id: 'chibi',   label: 'Чіббі' },
  { id: 'pixel',   label: 'Піксель' },
  { id: 'flat',    label: 'Flat' },
  { id: '3d',      label: '3D' },
  { id: 'fantasy', label: 'Фентезі' },
]

const PERSONALITIES = [
  { id: 'happy',       label: '😄 Веселий' },
  { id: 'brave',       label: '💪 Відважний' },
  { id: 'cute',        label: '🥰 Милий' },
  { id: 'wise',        label: '🧐 Мудрий' },
  { id: 'energetic',   label: '⚡ Живий' },
  { id: 'mischievous', label: '😏 Шибеник' },
]

const COLORS = [
  { id: 'red',     label: 'Червоний',   hex: '#EF4444' },
  { id: 'orange',  label: 'Помаранч.',  hex: '#F97316' },
  { id: 'yellow',  label: 'Жовтий',     hex: '#EAB308' },
  { id: 'green',   label: 'Зелений',    hex: '#22C55E' },
  { id: 'blue',    label: 'Блакитний',  hex: '#3B82F6' },
  { id: 'purple',  label: 'Фіолет.',    hex: '#8B5CF6' },
  { id: 'pink',    label: 'Рожевий',    hex: '#EC4899' },
  { id: 'brown',   label: 'Коричн.',    hex: '#92400E' },
  { id: 'gold',    label: 'Золото',     hex: '#D97706' },
  { id: 'rainbow', label: 'Веселка',    hex: null },
]

/** Resize a data-URL image to maxSize×maxSize via canvas, returns a smaller data URL */
function compressImage(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = maxSize
      canvas.height = maxSize
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, maxSize, maxSize)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = dataUrl
  })
}

const EMOTION_LABELS: Record<string, string> = {
  neutral: '😐 Нейтр.',
  happy:   '😄 Весел.',
  sad:     '😢 Сумний',
}

// ─── LocalStorage keys ────────────────────────────────────────────────────────

export const CUSTOM_MASCOT_IMAGES: Record<string, string> = {
  neutral: 'cq_custom_mascot_neutral',
  happy:   'cq_custom_mascot_happy',
  sad:     'cq_custom_mascot_sad',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedEmotion {
  emotion: string
  imageDataUrl: string | null
  success: boolean
  error?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateMascotSection() {
  const setGlobalMascot = useSetActiveMascot()

  const [type, setType]             = useState('chef')
  const [style, setStyle]           = useState('cartoon')
  const [personality, setPersonality] = useState('happy')
  const [color, setColor]           = useState('orange')
  const [subjectName, setSubjectName] = useState('')

  const [loading, setLoading]   = useState(false)
  const [emotions, setEmotions] = useState<GeneratedEmotion[] | null>(null)

  const typeCfg = TYPES.find(t => t.id === type)!

  async function handleGenerate() {
    setLoading(true)
    setEmotions(null)
    try {
      const res = await fetch('/api/mascot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, style, personality, color, subjectName }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Помилка генерації')
        return
      }
      setEmotions(data.emotions)
      const ok = data.emotions.filter((e: GeneratedEmotion) => e.success).length
      toast.success(`Згенеровано ${ok}/3 варіанти!`)
    } catch {
      toast.error('Помилка мережі — перевір з\'єднання')
    } finally {
      setLoading(false)
    }
  }

  async function handleEquip() {
    if (!emotions) return
    try {
      for (const e of emotions) {
        if (e.success && e.imageDataUrl) {
          const compressed = await compressImage(e.imageDataUrl, 256)
          localStorage.setItem(CUSTOM_MASCOT_IMAGES[e.emotion], compressed)
        }
      }
      setGlobalMascot('custom')
      toast.success('Кастомний маскот встановлено!')
    } catch {
      toast.error('Помилка збереження — спробуй ще раз')
    }
  }

  const hasResults = emotions !== null
  const canEquip   = hasResults && emotions.some(e => e.success)

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-purple-500/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center">
          <Wand2 size={18} className="text-purple-400" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">Генератор маскотів</p>
          <p className="text-[10px] text-gray-500">ШІ • Stability AI • 3 емоції</p>
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Тип</p>
        <div className="grid grid-cols-3 gap-1.5">
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setType(t.id); setSubjectName('') }}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs transition-all',
                type === t.id
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/5 bg-white/[0.03] text-gray-400 hover:border-white/20',
              )}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject input */}
      {typeCfg.subjectLabel && (
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{typeCfg.subjectLabel}</p>
          <input
            type="text"
            value={subjectName}
            onChange={e => setSubjectName(e.target.value.slice(0, 50))}
            placeholder={typeCfg.placeholder ?? ''}
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      )}

      {/* Style */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Стиль</p>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={cn(
                'py-1.5 rounded-xl border text-xs transition-all',
                style === s.id
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/5 bg-white/[0.03] text-gray-400 hover:border-white/20',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Характер</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PERSONALITIES.map(p => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={cn(
                'py-1.5 rounded-xl border text-[10px] transition-all',
                personality === p.id
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/5 bg-white/[0.03] text-gray-400 hover:border-white/20',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Колір</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              title={c.label}
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-all',
                color === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105',
              )}
              style={
                c.hex
                  ? { backgroundColor: c.hex }
                  : { background: 'conic-gradient(red, orange, yellow, green, blue, violet, red)' }
              }
            />
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all',
          loading
            ? 'bg-white/5 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white active:scale-95',
        )}
      >
        <Sparkles size={16} />
        {loading ? 'Генерація... (~30с)' : 'Згенерувати маскота'}
      </button>

      {/* Results */}
      {hasResults && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Результат</p>
          <div className="grid grid-cols-3 gap-2">
            {(emotions ?? []).map(e => (
              <div key={e.emotion} className="flex flex-col items-center gap-1">
                {e.success && e.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageDataUrl}
                    alt={e.emotion}
                    className="w-full aspect-square rounded-xl object-contain bg-white/5"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center text-gray-600 text-[10px] text-center px-1">
                    Помилка
                  </div>
                )}
                <p className="text-[9px] text-gray-500 text-center">{EMOTION_LABELS[e.emotion]}</p>
              </div>
            ))}
          </div>

          {canEquip && (
            <button
              onClick={handleEquip}
              className="w-full bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              Встановити маскота
            </button>
          )}
        </div>
      )}
    </div>
  )
}
