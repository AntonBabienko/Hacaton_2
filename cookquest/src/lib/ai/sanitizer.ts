/**
 * Input sanitization for AI prompts — prevents prompt injection attacks.
 * Based on patterns from axiba12 project, adapted for CookQuest.
 */

const INJECTION_PATTERNS = [
  // English injection attempts
  /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /act\s+as\s+(if|a|an)\s+/i,
  /pretend\s+(you|to\s+be)/i,
  /override\s+(the|your|all)/i,
  /disregard\s+(the|your|all|previous)/i,
  /bypass\s+(the|your|all|safety)/i,
  /jailbreak/i,
  /DAN\s*mode/i,
  // Ukrainian injection attempts
  /ігнору[йж]\s+(попередн|вс[іе]|правил)/i,
  /забудь\s+(все|попередн)/i,
  /ти\s+тепер\s+/i,
  /нов[іа]\s+інструкці/i,
  /прикинь(ся)?\s+що/i,
  /системн(ий|а)\s+промпт/i,
  /обійди\s+(захист|правил)/i,
]

/** Check if text contains injection attempts */
export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

/** Sanitize user text input — strip control chars & excessive whitespace */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''

  return input
    // Remove zero-width and invisible characters
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple spaces/newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, '  ')
    .trim()
}

/** Sanitize an array of ingredient strings */
export function sanitizeIngredients(ingredients: string[]): string[] {
  if (!Array.isArray(ingredients)) return []

  return ingredients
    .filter(i => typeof i === 'string' && i.trim().length > 0)
    .map(i => sanitizeText(i))
    .filter(i => i.length > 0 && i.length <= 100)
    .slice(0, 50) // max 50 ingredients
}

/** Wrap user data in delimiters to prevent prompt confusion */
export function wrapUserData(label: string, data: string): string {
  return `<user_data label="${label}">\n${data}\n</user_data>`
}
