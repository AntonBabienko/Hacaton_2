/**
 * Output validation for AI responses — ensures structured, safe results.
 * Based on patterns from axiba12 project, adapted for CookQuest.
 */

/** Clamp a number to a range */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Extract and parse JSON from AI text response */
export function extractJSON<T>(text: string, type: 'array' | 'object'): T | null {
  try {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
    const match = text.match(pattern)
    if (!match) return null
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

/** Validate and sanitize ingredient list from AI */
export function validateIngredients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(s => s.trim().slice(0, 100))
    .slice(0, 50)
}

interface RecipeOutput {
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  ingredients: string[]
  instructions: { step: number; title: string; description: string; requires_photo: boolean }[]
  cuisine_type: string
}

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const DIFFICULTY_POINT_MAP = { easy: 50, medium: 100, hard: 200 }

/** Validate and sanitize recipe output from AI */
export function validateRecipes(raw: unknown, pointMap?: Record<string, number>): RecipeOutput[] {
  if (!Array.isArray(raw)) return []

  const points = pointMap || DIFFICULTY_POINT_MAP

  return raw
    .filter((r: any) => r && typeof r === 'object' && r.name && r.instructions)
    .map((r: any) => {
      const difficulty = VALID_DIFFICULTIES.includes(r.difficulty) ? r.difficulty : 'medium'
      return {
        name: String(r.name).slice(0, 200),
        description: String(r.description || '').slice(0, 500),
        difficulty,
        points: points[difficulty as keyof typeof points] || 100,
        ingredients: validateIngredients(r.ingredients),
        instructions: validateInstructions(r.instructions),
        cuisine_type: String(r.cuisine_type || 'інше').slice(0, 50),
      }
    })
    .slice(0, 6)
}

function validateInstructions(raw: unknown): RecipeOutput['instructions'] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((s: any) => s && typeof s === 'object' && (s.title || s.description))
    .map((s: any, i: number) => ({
      step: typeof s.step === 'number' ? s.step : i + 1,
      title: String(s.title || `Крок ${i + 1}`).slice(0, 200),
      description: String(s.description || '').slice(0, 1000),
      requires_photo: Boolean(s.requires_photo),
    }))
    .slice(0, 20)
}

interface StepEvalOutput {
  matches: boolean
  quality: number
  comment: string
}

/** Validate step evaluation output */
export function validateStepEval(raw: unknown): StepEvalOutput {
  const fallback: StepEvalOutput = { matches: false, quality: 0, comment: 'Не вдалося оцінити' }
  if (!raw || typeof raw !== 'object') return fallback

  const r = raw as any
  return {
    matches: Boolean(r.matches),
    quality: clamp(typeof r.quality === 'number' ? r.quality : 50, 0, 100),
    comment: String(r.comment || 'Оцінка виконана').slice(0, 300),
  }
}

interface BattleEvalOutput {
  quality: number
  comment: string
}

/** Validate battle evaluation output */
export function validateBattleEval(raw: unknown): BattleEvalOutput {
  const fallback: BattleEvalOutput = { quality: 50, comment: 'Гарна страва!' }
  if (!raw || typeof raw !== 'object') return fallback

  const r = raw as any
  return {
    quality: clamp(typeof r.quality === 'number' ? r.quality : 50, 0, 100),
    comment: String(r.comment || 'Гарна страва!').slice(0, 300),
  }
}
