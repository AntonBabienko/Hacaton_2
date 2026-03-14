/**
 * Input sanitization for AI prompts — prevents prompt injection attacks.
 * Ported from axiba12 project (inputSanitizer.js), adapted for CookQuest + TypeScript.
 */

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directions?|context)/i,
  /forget\s+(everything|all|what|your)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(a|an|the|if)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as/i,
  /new\s+(instructions?|rules?|prompt|task|role|persona)/i,
  /system\s*:/i,
  /\[system\]/i,
  /\[assistant\]/i,
  /\[user\]/i,
  /<\s*system\s*>/i,
  /disregard\s+(your|all|previous)/i,
  /override\s+(your|all|previous|the)/i,
  /bypass\s+(your|all|the|safety)/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
  /give\s+me\s+\d+\s*(points?|балів|бали)/i,
  /add\s+\d+\s*(points?|балів|бали)/i,
  /grant\s+(me|us)\s+\d+/i,
  // Ukrainian-specific injection patterns
  /ігноруй\s+(всі\s+)?(попередні|минулі)\s+(інструкції|правила)/i,
  /забудь\s+(все|всі|про)/i,
  /ти\s+тепер\s+(є|будеш)/i,
  /нові\s+інструкції/i,
  /додай\s+мені\s+\d+\s*(балів|балів)/i,
  /прикинь(ся)?\s+що/i,
  /системн(ий|а)\s+промпт/i,
  /обійди\s+(захист|правил)/i,
]

const MAX_TEXT_LENGTH = 500
const MAX_INGREDIENT_NAME_LENGTH = 50

/** Check if text contains injection attempts */
export function detectInjection(text: string): boolean {
  if (typeof text !== 'string') return false
  return INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

/** Sanitize free-form user text — strip control chars & excessive whitespace */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, '  ')
    .trim()
}

/**
 * Sanitize free-form user comment (recipe request).
 * Returns { safe, sanitized, message? }
 */
export function sanitizeUserComment(rawText: string): { safe: boolean; sanitized: string; message?: string } {
  if (typeof rawText !== 'string') {
    return { safe: false, sanitized: '', message: 'Некоректний тип даних' }
  }

  const trimmed = rawText.trim()
  if (trimmed.length === 0) return { safe: true, sanitized: '' }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return { safe: false, sanitized: '', message: `Коментар не може перевищувати ${MAX_TEXT_LENGTH} символів` }
  }

  if (detectInjection(trimmed)) {
    return { safe: false, sanitized: '', message: 'Некоректний запит. Опишіть страву або побажання звичайними словами.' }
  }

  const sanitized = trimmed
    .replace(/[`]/g, "'")
    .replace(/\$\{[^}]*\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')

  return { safe: true, sanitized }
}

/**
 * Sanitize ingredient list — each name must be short, no injection.
 * Returns { safe, sanitized }
 */
export function sanitizeIngredientList(ingredients: string[]): { safe: boolean; sanitized: string[] } {
  if (!Array.isArray(ingredients)) {
    return { safe: false, sanitized: [] }
  }

  if (ingredients.length > 100) {
    return { safe: false, sanitized: [] }
  }

  const sanitized: string[] = []

  for (const item of ingredients) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_INGREDIENT_NAME_LENGTH) continue
    if (detectInjection(trimmed)) continue

    // Only allow letters (any lang), numbers, spaces, hyphens, dots, parens
    const cleaned = trimmed.replace(/[^\p{L}\p{N}\s\-.,()]/gu, '').trim()
    if (cleaned.length > 0) sanitized.push(cleaned)
  }

  return { safe: true, sanitized }
}

/** Legacy — simple ingredient sanitizer (backward compat) */
export function sanitizeIngredients(ingredients: string[]): string[] {
  return sanitizeIngredientList(ingredients).sanitized
}

/** Wrap user data in delimiters to prevent prompt confusion */
export function wrapUserData(label: string, data: string): string {
  return `<user_data label="${label}">\n${data}\n</user_data>`
}
