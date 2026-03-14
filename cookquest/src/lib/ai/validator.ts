/**
 * Output validation for AI responses.
 * Ported from axiba12 (groqClient.js + outputValidator.js), adapted for CookQuest + TypeScript.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const RECIPE_POINTS_MIN = 10
const RECIPE_POINTS_MAX = 500
const RECIPE_NAME_MAX = 100
const RECIPE_DESCRIPTION_MAX = 500
const STEP_TEXT_MAX = 800
const INGREDIENT_NAME_MAX = 120
const INGREDIENTS_MAX = 40
const STEPS_MAX = 40
const RECIPES_COUNT_MIN = 1
const RECIPES_COUNT_MAX = 4

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampString(str: unknown, max: number): string {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, max)
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val)
  if (isNaN(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

// Suspicious output patterns — may indicate prompt injection in AI output
const SUSPICIOUS_OUTPUT_PATTERNS = [
  /ignore\s+(all\s+)?previous/i,
  /give\s+(user|them)\s+\d+/i,
  /grant\s+\d+\s*points/i,
  /system\s*:/i,
  /<\s*script/i,
]

function isSuspicious(text: string): boolean {
  if (typeof text !== 'string') return false
  return SUSPICIOUS_OUTPUT_PATTERNS.some(p => p.test(text))
}

// ─── Robust JSON Parser (from axiba12 groqClient.js) ────────────────────────

/**
 * Parse JSON from AI text response.
 * Strategy: strip markdown fences → direct parse → bracket matching → repair truncated.
 */
export function extractJSON<T>(text: string, type: 'array' | 'object'): T | null {
  if (typeof text !== 'string') return null

  // Step 1: strip markdown fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  // Step 2: direct parse
  try { return JSON.parse(stripped) as T } catch { /* continue */ }

  // Step 3: find outermost bracket
  const open = type === 'array' ? '[' : '{'
  const close = type === 'array' ? ']' : '}'

  const bracketMatch = findOutermostBracket(stripped, open, close)
  if (bracketMatch) {
    try { return JSON.parse(bracketMatch) as T } catch { /* continue */ }
  }

  // Step 4: find last occurrence and try repair
  const lastIdx = stripped.lastIndexOf(open)
  if (lastIdx !== -1) {
    const candidate = stripped.slice(lastIdx)
    try { return JSON.parse(candidate) as T } catch { /* continue */ }

    const repaired = attemptRepair(candidate)
    if (repaired) {
      try { return JSON.parse(repaired) as T } catch { /* continue */ }
    }
  }

  return null
}

function findOutermostBracket(str: string, open: string, close: string): string | null {
  const start = str.indexOf(open)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < str.length; i++) {
    const ch = str[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return str.slice(start, i + 1)
    }
  }
  return null
}

function attemptRepair(truncated: string): string | null {
  let braces = 0
  let brackets = 0
  let inString = false
  let escape = false

  for (const ch of truncated) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }

  if (braces < 0 || brackets < 0) return null

  let repaired = truncated.trimEnd().replace(/,\s*$/, '')
  repaired += '}'.repeat(braces) + ']'.repeat(brackets)
  return repaired
}

// ─── Ingredient detection validator ─────────────────────────────────────────

export function validateIngredients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return raw
    .slice(0, 50)
    .map((item: any) => {
      if (typeof item === 'string') return clampString(item, INGREDIENT_NAME_MAX)
      if (item && typeof item === 'object') return clampString(item.name, INGREDIENT_NAME_MAX)
      return null
    })
    .filter((s): s is string => !!s && s.length > 0 && !isSuspicious(s))
}

// ─── Recipe validators (detailed, from axiba12 outputValidator.js) ──────────

export interface RecipeIngredient {
  name: string
  amount: string
  unit: string
}

export interface RecipeStep {
  stepNumber: number
  text: string
  isCheckpoint: boolean
  checkpointLabel: string | null
}

export interface RecipeOutput {
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  cuisine: string
  cookingTimeMinutes: number
}

function validateIngredient(raw: any): RecipeIngredient | null {
  if (!raw || typeof raw !== 'object') return null
  const name = clampString(raw.name, INGREDIENT_NAME_MAX)
  if (!name || isSuspicious(name)) return null
  return {
    name,
    amount: clampString(raw.amount ?? '', 30),
    unit: clampString(raw.unit ?? '', 20),
  }
}

function validateStep(raw: any, index: number): RecipeStep | null {
  if (!raw || typeof raw !== 'object') return null
  const text = clampString(raw.text ?? raw.description ?? '', STEP_TEXT_MAX)
  if (!text || isSuspicious(text)) return null
  return {
    stepNumber: index + 1,
    text,
    isCheckpoint: raw.isCheckpoint === true,
    checkpointLabel: raw.isCheckpoint ? clampString(raw.checkpointLabel ?? '', 80) : null,
  }
}

function validateSingleRecipe(raw: any): { valid: boolean; recipe?: RecipeOutput; reason?: string } {
  if (!raw || typeof raw !== 'object') return { valid: false, reason: 'not_an_object' }

  const name = clampString(raw.name ?? raw.title ?? '', RECIPE_NAME_MAX)
  if (!name || isSuspicious(name)) return { valid: false, reason: 'invalid_name' }

  const description = clampString(raw.description ?? raw.shortDescription ?? '', RECIPE_DESCRIPTION_MAX)
  const difficulty = (DIFFICULTY_LEVELS as readonly string[]).includes(raw.difficulty) ? raw.difficulty as RecipeOutput['difficulty'] : 'medium'
  const points = clampNumber(raw.points ?? raw.score ?? raw.basePoints, RECIPE_POINTS_MIN, RECIPE_POINTS_MAX, 50)

  // Ingredients — support both string[] and object[] formats
  const rawIngredients = Array.isArray(raw.ingredients) ? raw.ingredients : []
  let ingredients: RecipeIngredient[]

  if (rawIngredients.length > 0 && typeof rawIngredients[0] === 'string') {
    // Simple string format from old CookQuest prompts
    ingredients = rawIngredients
      .slice(0, INGREDIENTS_MAX)
      .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
      .map((s: string) => ({ name: clampString(s, INGREDIENT_NAME_MAX), amount: '', unit: '' }))
  } else {
    // Detailed object format from axiba12 prompts
    ingredients = rawIngredients.slice(0, INGREDIENTS_MAX).map(validateIngredient).filter(Boolean) as RecipeIngredient[]
  }
  if (ingredients.length === 0) return { valid: false, reason: 'no_ingredients' }

  // Steps — support both old format and new
  const rawSteps = Array.isArray(raw.steps ?? raw.instructions) ? (raw.steps ?? raw.instructions) : []
  let steps: RecipeStep[]

  if (rawSteps.length > 0 && rawSteps[0]?.title !== undefined && rawSteps[0]?.text === undefined) {
    // Old CookQuest format: { step, title, description, requires_photo }
    steps = rawSteps.slice(0, STEPS_MAX).map((s: any, i: number) => ({
      stepNumber: typeof s.step === 'number' ? s.step : i + 1,
      text: clampString(s.description ?? s.title ?? '', STEP_TEXT_MAX),
      isCheckpoint: Boolean(s.requires_photo ?? s.isCheckpoint),
      checkpointLabel: s.checkpointLabel ? clampString(s.checkpointLabel, 80) : (s.title ? clampString(s.title, 80) : null),
    })).filter((s: RecipeStep) => s.text.length > 0)
  } else {
    // axiba12 format: { text, isCheckpoint, checkpointLabel }
    steps = rawSteps.slice(0, STEPS_MAX).map((s: any, i: number) => validateStep(s, i)).filter(Boolean) as RecipeStep[]
  }
  if (steps.length === 0) return { valid: false, reason: 'no_steps' }

  const cuisine = clampString(raw.cuisine ?? raw.cuisine_type ?? '', 50)

  return {
    valid: true,
    recipe: {
      name,
      description,
      difficulty,
      points,
      ingredients,
      steps,
      cuisine,
      cookingTimeMinutes: clampNumber(raw.cookingTimeMinutes ?? raw.time ?? 30, 1, 600, 30),
    },
  }
}

/** Validate full recipe list from AI */
export function validateRecipes(raw: unknown, pointMap?: Record<string, number>): RecipeOutput[] {
  if (!Array.isArray(raw)) return []

  return raw
    .slice(0, RECIPES_COUNT_MAX)
    .map(r => {
      const result = validateSingleRecipe(r)
      if (!result.valid || !result.recipe) return null

      // Override points from pointMap if provided
      if (pointMap && result.recipe.difficulty in pointMap) {
        result.recipe.points = pointMap[result.recipe.difficulty] ?? result.recipe.points
      }

      return result.recipe
    })
    .filter(Boolean) as RecipeOutput[]
}

// ─── Quest validator ────────────────────────────────────────────────────────

export interface QuestOutput {
  description: string
  bonus_points: number
}

export function validateQuests(raw: unknown): QuestOutput[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((q: any) => q && typeof q === 'object' && q.description)
    .map((q: any) => ({
      description: clampString(q.description, 300),
      bonus_points: clamp(typeof q.bonus_points === 'number' ? q.bonus_points : 50, 10, 500),
    }))
    .slice(0, 7)
}

// ─── Step evaluation validator ──────────────────────────────────────────────

interface StepEvalOutput {
  matches: boolean
  quality: number
  comment: string
}

export function validateStepEval(raw: unknown): StepEvalOutput {
  const fallback: StepEvalOutput = { matches: false, quality: 0, comment: 'Не вдалося оцінити' }
  if (!raw || typeof raw !== 'object') return fallback

  const r = raw as any
  const score = clamp(typeof r.quality === 'number' ? r.quality : (typeof r.score === 'number' ? r.score : 50), 0, 100)
  const passed = typeof r.matches === 'boolean' ? r.matches : (typeof r.passed === 'boolean' ? r.passed : score >= 50)

  return {
    matches: passed,
    quality: score,
    comment: clampString(r.comment ?? r.feedback ?? 'Оцінка виконана', 300),
  }
}

// ─── Battle evaluation validator ────────────────────────────────────────────

interface BattleEvalOutput {
  quality: number
  comment: string
}

export function validateBattleEval(raw: unknown): BattleEvalOutput {
  const fallback: BattleEvalOutput = { quality: 50, comment: 'Гарна страва!' }
  if (!raw || typeof raw !== 'object') return fallback

  const r = raw as any
  return {
    quality: clamp(typeof r.quality === 'number' ? r.quality : 50, 0, 100),
    comment: clampString(r.comment ?? r.feedback ?? 'Гарна страва!', 300),
  }
}
